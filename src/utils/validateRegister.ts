import { UsernamePasswordDto } from "src/types/UsernamePasswordDto";

export const validateRegister = (options: UsernamePasswordDto) => {
  const { email, username, password } = options;
  if (!email.includes("@")) {
    return {
      errors: [{ field: "email", message: "Must be a valid email" }],
    };
  }

  if (username.length <= 2) {
    return {
      errors: [
        { field: "username", message: "Username must be greater than 2" },
      ],
    };
  }

  if (password.length <= 5) {
    return {
      errors: [
        { field: "password", message: "Password must be greater than 5" },
      ],
    };
  }
  return null;
};
