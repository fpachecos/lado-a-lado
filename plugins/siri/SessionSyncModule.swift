import Foundation

@objc(SessionSyncModule)
class SessionSyncModule: NSObject {

    /// Grava os dados de sessão no UserDefaults para que o App Intent possa ler
    /// sem precisar do layer JavaScript.
    @objc func saveSession(
        _ token: String,
        userId: String,
        babyId: String,
        supabaseUrl: String,
        supabaseAnonKey: String
    ) {
        let defaults = UserDefaults.standard
        defaults.set(token,          forKey: "SiriSession_accessToken")
        defaults.set(userId,         forKey: "SiriSession_userId")
        defaults.set(babyId,         forKey: "SiriSession_babyId")
        defaults.set(supabaseUrl,    forKey: "SiriSession_supabaseUrl")
        defaults.set(supabaseAnonKey, forKey: "SiriSession_supabaseAnonKey")
    }

    /// Remove todos os dados de sessão (chamar no logout).
    @objc func clearSession() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "SiriSession_accessToken")
        defaults.removeObject(forKey: "SiriSession_userId")
        defaults.removeObject(forKey: "SiriSession_babyId")
        defaults.removeObject(forKey: "SiriSession_supabaseUrl")
        defaults.removeObject(forKey: "SiriSession_supabaseAnonKey")
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
