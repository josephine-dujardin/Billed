/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import { toHaveClass } from "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import Bills from "../containers/Bills";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { formatDate, formatStatus } from "../app/format.js";
import router from "../app/Router.js";

const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
};

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList).toContain("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    test("Then each bill should display an action eye icon", () => {
      const rows = screen.getAllByTestId("tbody");
      const rowsLength = rows.length;
      const eyes = rows.map((a) => a.querySelector("[data-testid='icon-eye']"));
      const eyesLength = eyes.length;
      expect(rowsLength).toEqual(eyesLength);
    });

    test("Then each action eye icon click should open an image modal", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      document.body.innerHTML = BillsUI({ data: bills });
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      const handleClickIconEye1 = jest.fn(bills.handleClickIconEye);
      const eye = screen.getAllByTestId("icon-eye")[0];
      eye.addEventListener("click", handleClickIconEye1);
      userEvent.click(eye);
      expect(handleClickIconEye1).toHaveBeenCalled();

      await waitFor(() =>
        expect(screen.getByTestId("modal-content")).toHaveClass("modal-content")
      );
    });
  });

  describe("When I click on the NewBill button", () => {
    test("Then a form should be open", async () => {
      const bills = new Bills({
        document,
        onNavigate,
        localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(bills.handleClickNewBill);
      const buttonNewBill = screen.getByTestId("btn-new-bill");
      handleClickNewBill(buttonNewBill);
      userEvent.click(buttonNewBill);

      expect(handleClickNewBill).toHaveBeenCalled();
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });
    test("Then class name of window icon and mail icon change when I'm on NewBill page", () => {
      window.onNavigate(ROUTES_PATH.NewBill);
      const windowIcon = screen.getByTestId("icon-window");
      const mailIcon = screen.getByTestId("icon-mail");

      expect(windowIcon).not.toHaveClass("active-icon");
      expect(mailIcon).toHaveClass("active-icon");
    });
  });
});

// test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I'm on the Bill page", () => {
    test("fetches bills from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      document.body.innerHTML = BillsUI({ data: bills });
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      await waitFor(() => screen.getByText("Mes notes de frais"));
      const billsShown = screen.getAllByTestId("icon-eye");
      expect(billsShown).toBeTruthy();
    });
    test("Then displays date and status of bills", async () => {
      const bills = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const getList = jest.spyOn(bills, "getBills");
      const data = await bills.getBills();
      const mockBills = await mockStore.bills().list();
      const mockDate = mockBills[0].date;
      const mockStatus = mockBills[0].status;

      expect(getList).toHaveBeenCalledTimes(1);
      expect(data[0].date).toEqual(formatDate(mockDate));
      expect(data[0].status).toEqual(formatStatus(mockStatus));
    });

    test('Then if store is corrupted, it should console.log(error) and return (date: "test_date", status: undefined)', async () => {
      const corruptedStore = {
        bills() {
          return {
            list() {
              return Promise.resolve([
                {
                  id: "29047s289f6784pg",
                  vat: "40",
                  date: "test_date",
                  status: "dope",
                },
              ]);
            },
          };
        },
      };
      const bills = new Bills({
        document,
        onNavigate: window.onNavigate,
        store: corruptedStore,
        localStorage: window.localStorage,
      });
      const consoleLogError = jest.spyOn(console, "log");
      const data = await bills.getBills();

      expect(consoleLogError).toHaveBeenCalled();
      expect(data[0].date).toEqual("test_date");
      expect(data[0].status).toEqual(undefined);
    });
  });
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    test("Then bills must have been called from the mockStore", async () => {
      const spy = jest.spyOn(mockStore, "bills");
      const bills = await mockStore.bills().list();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(bills.length).toBe(4);
    });

    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      let response;
      try {
        response = await mockStore.bills().list();
      } catch (err) {
        response = err;
      }

      document.body.innerHTML = BillsUI({ error: response });
      const message = screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      let response;
      try {
        response = await mockStore.bills().list();
      } catch (err) {
        response = err;
      }

      document.body.innerHTML = BillsUI({ error: response });
      const message = screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
