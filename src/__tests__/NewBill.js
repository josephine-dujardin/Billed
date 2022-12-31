/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import { ROUTES } from "../constants/routes.js";
import mockStore from "../__mocks__/store";
import { localStorageMock } from "../__mocks__/localStorage.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then It should renders New bill page", () => {
      document.body.innerHTML = NewBillUI();

      const expenseName = screen.getByTestId("expense-name");
      expect(expenseName.value).toBe("");

      const amount = screen.getByTestId("amount");
      expect(amount.value).toBe("");

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => e.preventDefault());

      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    test("Then New bill form should show an error if file extension is incorrect", () => {
      // Set up environment
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      const newBill = new NewBill({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // Define body
      document.body.innerHTML = NewBillUI();

      // Set up random JSON file
      const str = JSON.stringify([{ data: "test" }]);
      const blob = new Blob([str]);
      const file = new File([blob], "values.json", {
        type: "application/JSON",
      });

      const inputFile = screen.getByTestId("file");
      const handleChangeFile = jest.fn(() =>
        newBill.handleChangeFile({ target: inputFile })
      );
      inputFile.addEventListener("change", handleChangeFile);
      userEvent.upload(inputFile, file);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(screen.getByTestId("fileFormat-errorMessage")).toBeVisible;
    });

    test("Then, when I click on submit button, I'm directed on the bills page", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const form = screen.getByTestId("form-new-bill");
      const newBill = new NewBill({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
      expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
    });
  });
});

// test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  describe("When I transfer a new bill", () => {
    test("Then the new bill must be displayed", async () => {
      const spyInstance = jest.spyOn(mockStore, "bills");
      const bills = await mockStore.bills().list();
      expect(spyInstance).toHaveBeenCalledTimes(1);
      expect(bills.length).toBe(4);
    });

    describe("When the API call fails with a 404 error message", () => {
      test("Then a 404 error message must be displayed", async () => {
        const bill = await mockStore.bills().list();
        mockStore.bills.mockImplementationOnce(() => {
          return {
            update: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });

        let response;
        try {
          response = await mockStore.bills().update(bill);
        } catch (err) {
          response = err;
        }

        document.body.innerHTML = BillsUI({ error: response });
        const message = screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });
    });

    describe("When the API call fails with a 500 error message", () => {
      test("Then a 500 error message must be displayed", async () => {
        const bill = await mockStore.bills().list();
        mockStore.bills.mockImplementationOnce(() => {
          return {
            update: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        let response;
        try {
          response = await mockStore.bills().update(bill);
        } catch (err) {
          response = err;
        }

        document.body.innerHTML = BillsUI({ error: response });
        const message = screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
