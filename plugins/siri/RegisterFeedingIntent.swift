import AppIntents
import Foundation

// MARK: - BreastSide Enum

@available(iOS 16.0, *)
enum BreastSideEnum: String, AppEnum {
    case left
    case right
    case both

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Seio")

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

    @Parameter(title: "Seio", requestValueDialog: "Qual seio? Esquerdo, direito ou ambos?")
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
        case .left:  breastName = "esquerdo"
        case .right: breastName = "direito"
        case .both:  breastName = "ambos"
        }

        return .result(dialog: "Mamada no seio \(breastName) registrada agora!")
    }
}

// MARK: - Last Feeding Intent

@available(iOS 16.0, *)
struct LastFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Última Mamada"
    static var description = IntentDescription(
        "Consulta o seio e o horário da última mamada registrada no Lado a Lado."
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
            breastName = "esquerdo"
            preposition = "no seio"
        case "right":
            breastName = "direito"
            preposition = "no seio"
        case "both":
            breastName = "ambos os seios"
            preposition = "em"
        default:
            breastName = breast
            preposition = "no seio"
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

// MARK: - App Shortcuts (frases reconhecidas pelo Siri)

@available(iOS 16.0, *)
struct LadoALadoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RegisterFeedingIntent(),
            phrases: [
                "Registrar mamada no seio \(\.$breast) no \(.applicationName)",
                "Mamada no seio \(\.$breast) no \(.applicationName)",
                "Anotar mamada no seio \(\.$breast) no \(.applicationName)",
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
    }
}
