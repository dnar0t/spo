export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    login: string;
    fullName: string;
    email: string | null;
    roles: string[];
  };
}
