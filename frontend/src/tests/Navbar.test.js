import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../components/Navbar"; 

// Mock useAuth
jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));


const { useAuth } = require("../context/AuthContext");

describe("Navbar", () => {

  test("renders navbar links and user email", () => {
    useAuth.mockReturnValue({
      user: { email: "test@test.com" },
      logout: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText(/wardrobe/i)).toBeInTheDocument();
    expect(screen.getByText(/^favorites$/i)).toBeInTheDocument();
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
    expect(screen.getByText(/test@test.com/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  test("calls logout and navigates on logout click", async () => {
    const mockLogout = jest.fn().mockResolvedValue();

    useAuth.mockReturnValue({
      user: { email: "test@test.com" },
      logout: mockLogout,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/logout/i));

    expect(mockLogout).toHaveBeenCalled();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
  });

});