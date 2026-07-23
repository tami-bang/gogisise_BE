export declare class SignupDto {
    email: string;
    password: string;
    nickname: string;
    phone: string;
}
export declare class LoginDto {
    email: string;
    password: string;
    autoLogin?: boolean;
}
export declare class KakaoLoginDto {
    kakaoAccessToken: string;
}
export declare class FindEmailDto {
    phone: string;
}
export declare class SendResetLinkDto {
    email: string;
}
