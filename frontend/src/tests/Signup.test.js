import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "../pages/Signup";

// Mock useAuth hook
jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  // render Link as an inline element to avoid invalid nesting inside <p>
  Link: ({ children }) => <a href="/">{children}</a>,
  // MemoryRouter should render children without adding extra block-level tags
  MemoryRouter: ({ children }) => <>{children}</>,
}));

const { useAuth } = require("../context/AuthContext");

describe("Signup Page", () => {

  // Test that the form renders correctly
  test("renders signup form", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signup: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password \(min 6 characters\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByText(/create account/i)).toBeInTheDocument();
  });

  // Test validation: empty email
  test("shows error if email is empty", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signup: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/create account/i));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  // Test validation: password too short
  test("shows error if password is too short", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signup: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Password \(min 6 characters\)/i), {
      target: { value: "123" },
    });

    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByText(/create account/i));

    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });

  // Test validation: passwords do not match
  test("shows error if passwords do not match", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signup: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Password \(min 6 characters\)/i), {
      target: { value: "123456" },
    });

    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
      target: { value: "different" },
    });

    fireEvent.click(screen.getByText(/create account/i));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // Test successful signup
  test("calls signup and navigates on success", async () => {
    const mockSignup = jest.fn().mockResolvedValue();

    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signup: mockSignup,
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Password \(min 6 characters\)/i), {
      target: { value: "123456" },
    });

    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByText(/create account/i));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith("test@test.com", "123456");
      
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

});