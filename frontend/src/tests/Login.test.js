import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

// Mock useAuth
jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const { useAuth } = require("../context/AuthContext");

describe("Login Page", () => {

  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test("renders login form", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test("shows error if email is empty", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/login/i));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  test("shows error if password is empty", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@test.com" },
    });

    fireEvent.click(screen.getByText(/login/i));

    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  test("calls login on successful submit", async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      user: { id: 1, email: "test@test.com", emailVerified: true },
      verificationRequired: false,
    });

    useAuth.mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@test.com", "1234");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

});