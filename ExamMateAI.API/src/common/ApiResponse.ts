export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | null;
  errors?: string[];
}

export class ApiResponseHelper {
  public static success<T>(data?: T | null, message: string = 'Operation successful'): ApiResponse<T> {
    return {
      success: true,
      message,
      data: data ?? null,
      errors: [],
    };
  }

  public static failure(message: string = 'Operation failed', errors: string[] = []): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      errors: errors.length > 0 ? errors : [message],
    };
  }
}
