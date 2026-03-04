const STORAGE_KEY = "daily-rent-calendar-v3";

const defaultApartments = ["Квартира 1", "Квартира 2", "Квартира 3"];
const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const state = loadState();

const yearSelect = document.getElementById("yearSelect");
const calendarModeSelect = document.getElementById("calendarModeSelect");
const apartmentSelect = document.getElementById("apartmentSelect");
const bookingApartment = document.getElementById("bookingApartment");
const bookingsApartmentFilter = document.getElementById("bookingsApartmentFilter");
const yearCalendar = document.getElementById("yearCalendar");
const bookingsByApartment = document.getElementById("bookingsByApartment");
const bookingForm = document.getElementById("bookingForm");
const apartmentsDialog = document.getElementById("apartmentsDialog");
const apartmentsForm = document.getElementById("apartmentsForm");
const apartmentsList = document.getElementById("apartmentsList");
const manageApartmentsBtn = document.getElementById("manageApartmentsBtn");
const addApartmentBtn = document.getElementById("addApartmentBtn");
const newApartmentNameInput = document.getElementById("newApartmentName");

init();

function init() {
  fillYearSelect();
  syncApartmentSelects();

  calendarModeSelect.value = state.calendarMode;
  bookingsApartmentFilter.value = state.bookingsFilter;
  toggleApartmentSelectState();

  renderCalendar();
  renderBookingsList();

  yearSelect.addEventListener("change", () => {
    state.selectedYear = Number(yearSelect.value);
    persistAndRender();
  });

  calendarModeSelect.addEventListener("change", () => {
    state.calendarMode = calendarModeSelect.value;
    toggleApartmentSelectState();
    persistAndRender();
  });

  apartmentSelect.addEventListener("change", () => {
    state.selectedApartmentId = apartmentSelect.value;
    bookingApartment.value = apartmentSelect.value;
    persistAndRender();
  });

  bookingApartment.addEventListener("change", () => {
    state.selectedApartmentId = bookingApartment.value;
    apartmentSelect.value = bookingApartment.value;
    persistAndRender();
  });

  bookingsApartmentFilter.addEventListener("change", () => {
    state.bookingsFilter = bookingsApartmentFilter.value;
    persist();
    renderBookingsList();
  });

  bookingForm.addEventListener("submit", handleBookingSubmit);

  manageApartmentsBtn.addEventListener("click", () => {
    renderApartmentsDialog();
    apartmentsDialog.showModal();
  });

  addApartmentBtn.addEventListener("click", addApartment);
  apartmentsForm.addEventListener("submit", () => persist());
}

function persistAndRender() {
  persist();
  renderCalendar();
  renderBookingsList();
}

function toggleApartmentSelectState() {
  apartmentSelect.disabled = state.calendarMode === "all";
}

function fillYearSelect() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  yearSelect.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");

  if (!years.includes(state.selectedYear)) {
    state.selectedYear = currentYear;
  }

  yearSelect.value = String(state.selectedYear);
}

function syncApartmentSelects() {
  if (state.apartments.length === 0) {
    state.apartments.push(createApartment("Квартира 1"));
  }

  if (!state.apartments.some((apartment) => apartment.id === state.selectedApartmentId)) {
    state.selectedApartmentId = state.apartments[0].id;
  }

  const apartmentOptions = state.apartments
    .map((apartment) => `<option value="${apartment.id}">${apartment.name}</option>`)
    .join("");

  apartmentSelect.innerHTML = apartmentOptions;
  bookingApartment.innerHTML = apartmentOptions;
  apartmentSelect.value = state.selectedApartmentId;
  bookingApartment.value = state.selectedApartmentId;

  const filterOptions = [`<option value="all">Все квартиры</option>`]
    .concat(
      state.apartments.map(
        (apartment) => `<option value="${apartment.id}">${apartment.name}</option>`,
      ),
    )
    .join("");

  bookingsApartmentFilter.innerHTML = filterOptions;

  if (
    state.bookingsFilter !== "all" &&
    !state.apartments.some((apartment) => apartment.id === state.bookingsFilter)
  ) {
    state.bookingsFilter = "all";
  }

  bookingsApartmentFilter.value = state.bookingsFilter;
}

function handleBookingSubmit(event) {
  event.preventDefault();

  const apartmentId = bookingApartment.value;
  const client = document.getElementById("clientName").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const comment = document.getElementById("comment").value.trim();

  if (!client || !startDate || !endDate) {
    return;
  }

  if (startDate > endDate) {
    alert("Дата заезда не может быть позже даты выезда.");
    return;
  }

  const hasConflict = state.bookings.some((booking) => {
    if (booking.apartmentId !== apartmentId) {
      return false;
    }

    return !(endDate < booking.startDate || startDate > booking.endDate);
  });

  if (hasConflict) {
    alert("Для выбранной квартиры в этом диапазоне уже есть заселение.");
    return;
  }

  state.bookings.push({
    id: crypto.randomUUID(),
    apartmentId,
    client,
    startDate,
    endDate,
    comment,
  });

  state.selectedApartmentId = apartmentId;
  apartmentSelect.value = apartmentId;

  bookingForm.reset();
  bookingApartment.value = apartmentId;
  persistAndRender();
}

function renderCalendar() {
  yearCalendar.innerHTML = "";

  for (let month = 0; month < 12; month += 1) {
    yearCalendar.appendChild(createMonthCard(state.selectedYear, month));
  }
}

function createMonthCard(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const wrapper = document.createElement("article");
  wrapper.className = "month-card";

  const title = document.createElement("h3");
  title.textContent = `${monthNames[month]} ${year}`;
  wrapper.appendChild(title);

  const scroll = document.createElement("div");
  scroll.className = "month-scroll";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const apartmentHeader = document.createElement("th");
  apartmentHeader.className = "apartment-col";
  apartmentHeader.textContent = "Квартира";
  headRow.appendChild(apartmentHeader);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayHead = document.createElement("th");
    dayHead.textContent = String(day);
    headRow.appendChild(dayHead);
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const apartmentsToShow =
    state.calendarMode === "all"
      ? state.apartments
      : state.apartments.filter((apartment) => apartment.id === state.selectedApartmentId);

  apartmentsToShow.forEach((apartment) => {
    const row = document.createElement("tr");
    const apartmentCell = document.createElement("td");
    apartmentCell.className = "apartment-col";
    apartmentCell.textContent = apartment.name;
    row.appendChild(apartmentCell);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = document.createElement("td");
      const date = toIsoDate(year, month, day);
      const booking = findBookingByDate(apartment.id, date);
      const isPast = date < todayIso();

      if (booking) {
        cell.className = isPast ? "booked past" : "booked";
        cell.textContent = getBoundaryMark(booking, date);
      } else {
        cell.className = isPast ? "free past" : "free";
      }

      cell.title = booking
        ? `${booking.client}${booking.comment ? " — " + booking.comment : ""}`
        : "Свободно";
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  scroll.appendChild(table);
  wrapper.appendChild(scroll);

  return wrapper;
}

function getBoundaryMark(booking, date) {
  const isStart = date === booking.startDate;
  const isEnd = date === booking.endDate;

  if (isStart && isEnd) {
    return "()";
  }
  if (isStart) {
    return "(";
  }
  if (isEnd) {
    return ")";
  }
  return "";
}

function findBookingByDate(apartmentId, date) {
  return state.bookings.find(
    (booking) => booking.apartmentId === apartmentId && date >= booking.startDate && date <= booking.endDate,
  );
}

function renderBookingsList() {
  bookingsByApartment.innerHTML = "";

  const apartmentsToRender =
    state.bookingsFilter === "all"
      ? state.apartments
      : state.apartments.filter((apartment) => apartment.id === state.bookingsFilter);

  apartmentsToRender.forEach((apartment) => {
    const group = document.createElement("article");
    group.className = "booking-group";

    const title = document.createElement("h3");
    title.textContent = apartment.name;
    group.appendChild(title);

    const list = document.createElement("ul");
    list.className = "bookings-list";

    const currentBookings = state.bookings
      .filter((booking) => booking.apartmentId === apartment.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (currentBookings.length === 0) {
      list.innerHTML = `<li>Нет заселений.</li>`;
    } else {
      currentBookings.forEach((booking) => {
        const item = document.createElement("li");
        item.innerHTML = `
          <div>
            <strong>${booking.client}</strong><br />
            ${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}
            ${booking.comment ? `<br /><small>${booking.comment}</small>` : ""}
          </div>
          <button type="button" class="secondary">Удалить</button>
        `;

        item.querySelector("button").addEventListener("click", () => {
          state.bookings = state.bookings.filter((entry) => entry.id !== booking.id);
          persistAndRender();
        });

        list.appendChild(item);
      });
    }

    group.appendChild(list);
    bookingsByApartment.appendChild(group);
  });
}

function renderApartmentsDialog() {
  apartmentsList.innerHTML = "";

  state.apartments.forEach((apartment) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${apartment.name}</span>`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "secondary";
    removeBtn.textContent = "Удалить";
    removeBtn.addEventListener("click", () => removeApartment(apartment.id));

    item.appendChild(removeBtn);
    apartmentsList.appendChild(item);
  });
}

function addApartment() {
  const name = newApartmentNameInput.value.trim();
  if (!name) {
    return;
  }

  state.apartments.push(createApartment(name));
  state.selectedApartmentId = state.apartments[state.apartments.length - 1].id;
  newApartmentNameInput.value = "";

  syncApartmentSelects();
  renderApartmentsDialog();
  persistAndRender();
}

function removeApartment(apartmentId) {
  if (state.apartments.length === 1) {
    alert("Нужна минимум одна квартира.");
    return;
  }

  state.apartments = state.apartments.filter((apartment) => apartment.id !== apartmentId);
  state.bookings = state.bookings.filter((booking) => booking.apartmentId !== apartmentId);

  if (state.selectedApartmentId === apartmentId) {
    state.selectedApartmentId = state.apartments[0].id;
  }

  syncApartmentSelects();
  renderApartmentsDialog();
  persistAndRender();
}

function createApartment(name) {
  return { id: crypto.randomUUID(), name };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("ru-RU");
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      throw new Error("Пустое хранилище");
    }

    return {
      selectedYear: parsed.selectedYear || new Date().getFullYear(),
      selectedApartmentId: parsed.selectedApartmentId || "",
      calendarMode: parsed.calendarMode || "all",
      bookingsFilter: parsed.bookingsFilter || "all",
      apartments: Array.isArray(parsed.apartments) ? parsed.apartments : [],
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
    };
  } catch {
    const apartments = defaultApartments.map((name) => createApartment(name));
    return {
      selectedYear: new Date().getFullYear(),
      selectedApartmentId: apartments[0].id,
      calendarMode: "all",
      bookingsFilter: "all",
      apartments,
      bookings: [],
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
