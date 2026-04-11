import AppIntents
import Foundation

// MARK: - BreastSide Enum

@available(iOS 16.0, *)
enum BreastSideEnum: String, AppEnum {
    case left
    case right
    case both

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Mama")

    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .left:  DisplayRepresentation(title: "Esquerdo"),
        .right: DisplayRepresentation(title: "Direito"),
        .both:  DisplayRepresentation(title: "Ambos"),
    ]
}

// MARK: - App Intent

@available(iOS 16.0, *)
struct RegisterFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Registrar Mamada"
    static var description = IntentDescription(
        "Registra uma mamada no Lado a Lado com a hora atual."
    )
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Mama", requestValueDialog: "Qual mama? Esquerda, direita ou ambas?")
    var breast: BreastSideEnum

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults.standard

        guard
            let token       = defaults.string(forKey: "SiriSession_accessToken"),
            let babyId      = defaults.string(forKey: "SiriSession_babyId"),
            let supabaseUrl = defaults.string(forKey: "SiriSession_supabaseUrl"),
            let anonKey     = defaults.string(forKey: "SiriSession_supabaseAnonKey")
        else {
            return .result(dialog: "Abra o Lado a Lado primeiro para ativar o Siri.")
        }

        guard let url = URL(string: "\(supabaseUrl)/rest/v1/baby_feedings") else {
            return .result(dialog: "Configuração inválida. Abra o app e tente novamente.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json",  forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey,             forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)",   forHTTPHeaderField: "Authorization")
        request.setValue("ladoalado",         forHTTPHeaderField: "Accept-Profile")
        request.setValue("ladoalado",         forHTTPHeaderField: "Content-Profile")
        request.setValue("return=minimal",    forHTTPHeaderField: "Prefer")

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let body: [String: Any] = [
            "baby_id":    babyId,
            "started_at": formatter.string(from: Date()),
            "breast":     breast.rawValue,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard
            let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode)
        else {
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
                return .result(dialog: "Sessão expirada. Abra o Lado a Lado e faça login novamente.")
            }
            return .result(dialog: "Não foi possível registrar a mamada. Tente novamente.")
        }

        let breastName: String
        switch breast {
        case .left:  breastName = "esquerda"
        case .right: breastName = "direita"
        case .both:  breastName = "ambas"
        }

        return .result(dialog: "Mamada na mama \(breastName) registrada agora!")
    }
}

// MARK: - Last Feeding Intent

@available(iOS 16.0, *)
struct LastFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Última Mamada"
    static var description = IntentDescription(
        "Consulta a mama e o horário da última mamada registrada no Lado a Lado."
    )
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults.standard

        guard
            let token       = defaults.string(forKey: "SiriSession_accessToken"),
            let babyId      = defaults.string(forKey: "SiriSession_babyId"),
            let supabaseUrl = defaults.string(forKey: "SiriSession_supabaseUrl"),
            let anonKey     = defaults.string(forKey: "SiriSession_supabaseAnonKey")
        else {
            return .result(dialog: "Abra o Lado a Lado primeiro para ativar o Siri.")
        }

        var components = URLComponents(string: "\(supabaseUrl)/rest/v1/baby_feedings")!
        components.queryItems = [
            URLQueryItem(name: "select",   value: "breast,started_at"),
            URLQueryItem(name: "baby_id",  value: "eq.\(babyId)"),
            URLQueryItem(name: "order",    value: "started_at.desc"),
            URLQueryItem(name: "limit",    value: "1"),
        ]

        guard let url = components.url else {
            return .result(dialog: "Configuração inválida. Abra o app e tente novamente.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey,            forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)",  forHTTPHeaderField: "Authorization")
        request.setValue("ladoalado",        forHTTPHeaderField: "Accept-Profile")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard
            let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode)
        else {
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
                return .result(dialog: "Sessão expirada. Abra o Lado a Lado e faça login novamente.")
            }
            return .result(dialog: "Não foi possível consultar a última mamada. Tente novamente.")
        }

        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            let first = json.first,
            let breast = first["breast"] as? String,
            let startedAtStr = first["started_at"] as? String
        else {
            return .result(dialog: "Nenhuma mamada registrada ainda.")
        }

        let breastName: String
        let preposition: String
        switch breast {
        case "left":
            breastName = "esquerda"
            preposition = "na mama"
        case "right":
            breastName = "direita"
            preposition = "na mama"
        case "both":
            breastName = "ambas as mamas"
            preposition = "em"
        default:
            breastName = breast
            preposition = "na mama"
        }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let timeStr: String
        if let date = isoFormatter.date(from: startedAtStr) {
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            timeFormatter.locale = Locale(identifier: "pt_BR")
            timeStr = timeFormatter.string(from: date)
        } else {
            timeStr = startedAtStr
        }

        return .result(dialog: "A última mamada foi \(preposition) \(breastName) às \(timeStr).")
    }
}

// MARK: - Last Measurements Intent

@available(iOS 16.0, *)
struct LastMeasurementsIntent: AppIntent {
    static var title: LocalizedStringResource = "Medidas do Bebê"
    static var description = IntentDescription(
        "Consulta o último peso e altura registrados do bebê no Lado a Lado."
    )
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults.standard

        guard
            let token       = defaults.string(forKey: "SiriSession_accessToken"),
            let babyId      = defaults.string(forKey: "SiriSession_babyId"),
            let supabaseUrl = defaults.string(forKey: "SiriSession_supabaseUrl"),
            let anonKey     = defaults.string(forKey: "SiriSession_supabaseAnonKey")
        else {
            return .result(dialog: "Abra o Lado a Lado primeiro para ativar o Siri.")
        }

        func makeRequest(table: String, select: String) -> URLRequest? {
            var components = URLComponents(string: "\(supabaseUrl)/rest/v1/\(table)")
            components?.queryItems = [
                URLQueryItem(name: "select",  value: select),
                URLQueryItem(name: "baby_id", value: "eq.\(babyId)"),
                URLQueryItem(name: "order",   value: "measured_at.desc"),
                URLQueryItem(name: "limit",   value: "1"),
            ]
            guard let url = components?.url else { return nil }
            var req = URLRequest(url: url)
            req.httpMethod = "GET"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(anonKey,            forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(token)",  forHTTPHeaderField: "Authorization")
            req.setValue("ladoalado",        forHTTPHeaderField: "Accept-Profile")
            return req
        }

        guard
            let weightReq = makeRequest(table: "baby_weights", select: "weight_grams,measured_at"),
            let heightReq = makeRequest(table: "baby_heights", select: "height_mm,measured_at")
        else {
            return .result(dialog: "Configuração inválida. Abra o app e tente novamente.")
        }

        async let weightFetch = URLSession.shared.data(for: weightReq)
        async let heightFetch = URLSession.shared.data(for: heightReq)

        let (weightData, weightResponse) = try await weightFetch
        let (heightData, _)              = try await heightFetch

        if let http = weightResponse as? HTTPURLResponse, http.statusCode == 401 {
            return .result(dialog: "Sessão expirada. Abra o Lado a Lado e faça login novamente.")
        }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "pt_BR")

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "d 'de' MMMM"
        displayFormatter.locale = Locale(identifier: "pt_BR")

        func formatDate(_ str: String) -> String {
            guard let date = dateFormatter.date(from: str) else { return str }
            return displayFormatter.string(from: date)
        }

        var weightPart = ""
        if
            let json  = try? JSONSerialization.jsonObject(with: weightData) as? [[String: Any]],
            let first = json.first,
            let grams = first["weight_grams"] as? Int,
            let dateStr = first["measured_at"] as? String
        {
            let kg    = Double(grams) / 1000.0
            let kgStr = String(format: "%.3g", kg).replacingOccurrences(of: ".", with: ",")
            weightPart = "Peso: \(kgStr) kg, medido em \(formatDate(dateStr))."
        }

        var heightPart = ""
        if
            let json  = try? JSONSerialization.jsonObject(with: heightData) as? [[String: Any]],
            let first = json.first,
            let mm    = first["height_mm"] as? Int,
            let dateStr = first["measured_at"] as? String
        {
            let cm    = Double(mm) / 10.0
            let cmStr = String(format: "%.4g", cm).replacingOccurrences(of: ".", with: ",")
            heightPart = "Altura: \(cmStr) cm, medida em \(formatDate(dateStr))."
        }

        if weightPart.isEmpty && heightPart.isEmpty {
            return .result(dialog: "Nenhuma medida registrada ainda. Abra o Lado a Lado para cadastrar o peso e a altura do bebê.")
        }

        let dialog = [weightPart, heightPart].filter { !$0.isEmpty }.joined(separator: " ")
        return .result(dialog: IntentDialog(stringLiteral: dialog))
    }
}

// MARK: - App Shortcuts (frases reconhecidas pelo Siri)

@available(iOS 16.0, *)
struct LadoALadoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RegisterFeedingIntent(),
            phrases: [
                "Registrar mamada na mama \(\.$breast) no \(.applicationName)",
                "Mamada na mama \(\.$breast) no \(.applicationName)",
                "Anotar mamada na mama \(\.$breast) no \(.applicationName)",
            ],
            shortTitle: "Registrar Mamada",
            systemImageName: "drop.fill"
        )
        AppShortcut(
            intent: LastFeedingIntent(),
            phrases: [
                "Qual foi a última mamada no \(.applicationName)",
                "Quando foi a última mamada no \(.applicationName)",
                "Última mamada no \(.applicationName)",
            ],
            shortTitle: "Última Mamada",
            systemImageName: "clock.fill"
        )
        AppShortcut(
            intent: LastMeasurementsIntent(),
            phrases: [
                "Quais as medidas do meu bebê no \(.applicationName)",
                "Qual o peso do meu bebê no \(.applicationName)",
                "Medidas do bebê no \(.applicationName)",
            ],
            shortTitle: "Medidas do Bebê",
            systemImageName: "ruler.fill"
        )
    }
}
