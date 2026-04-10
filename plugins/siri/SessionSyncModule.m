#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SessionSyncModule, NSObject)

RCT_EXTERN_METHOD(
    saveSession:(NSString *)token
    userId:(NSString *)userId
    babyId:(NSString *)babyId
    supabaseUrl:(NSString *)supabaseUrl
    supabaseAnonKey:(NSString *)supabaseAnonKey
)

RCT_EXTERN_METHOD(clearSession)

@end
