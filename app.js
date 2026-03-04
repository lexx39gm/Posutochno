const STORAGE_KEY = "daily-rent-calendar-v1";

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
const apartmentSelect = document.getElementById("apartmentSelect");
const bookingApartment = document.getElementById("bookingApartment");
const yearCalendar = document.getElementById("yearCalendar");
const bookingForm = document.getElementById("bookingForm");
const bookingsList = document.getElementById("bookingsList");
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
  renderCalendar();
  renderBookingsList();

  yearSelect.addEventListener("change", () => {
    state.selectedYear = Number(yearSelect.value);
    persist();
    renderCalendar();
    renderBookingsList();
  });

  apartmentSelect.addEventListener("change", () => {
    state.selectedApartmentId = apartmentSelect.value;
    bookingApartment.value = apartmentSelect.value;
    persist();
    renderCalendar();
    renderBookingsList();
  });

  bookingApartment.addEventListener("change", () => {
    state.selectedApartmentId = bookingApartment.value;
    apartmentSelect.value = bookingApartment.value;
    persist();
    renderCalendar();
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
    const newApartment = createApartment("Квартира 1");
    state.apartments.push(newApartment);
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
  persist();
  renderCalendar();
  renderBookingsList();
}

function renderCalendar() {
  yearCalendar.innerHTML = "";

  for (let month = 0; month < 12; month += 1) {
    yearCalendar.appendChild(createMonthCard(state.selectedYear, month));
  }
}

function createMonthCard(year, month) {
  const template = document.getElementById("monthTemplate");
  const fragment = template.content.cloneNode(true);

  const card = fragment.querySelector(".month-card");
  const title = fragment.querySelector("h3");
  const tbody = fragment.querySelector("tbody");
  title.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let day = 1;
  while (day <= daysInMonth) {
    const row = document.createElement("tr");

    for (let col = 0; col < 7; col += 1) {
      const cell = document.createElement("td");

      if ((tbody.children.length === 0 && col < startWeekday) || day > daysInMonth) {
        cell.className = "empty";
      } else {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const booking = findBookingByDate(state.selectedApartmentId, date);
        cell.className = booking ? "booked" : "free";
        cell.innerHTML = `<span class="day-num">${day}</span><span class="day-tip">${booking ? booking.client : "Свободно"}</span>`;
        cell.title = booking
          ? `${booking.client}${booking.comment ? ` — ${booking.comment}` : ""}`
          : "Свободно";
        day += 1;
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  }

  return card;
}

function findBookingByDate(apartmentId, date) {
  return state.bookings.find(
    (booking) =>
      booking.apartmentId === apartmentId &&
      date >= booking.startDate &&
      date <= booking.endDate,
  );
}

function renderBookingsList() {
  const selectedApartment = state.apartments.find(
    (apartment) => apartment.id === state.selectedApartmentId,
  );

  const currentBookings = state.bookings
    .filter((booking) => booking.apartmentId === state.selectedApartmentId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  bookingsList.innerHTML = "";

  if (currentBookings.length === 0) {
    bookingsList.innerHTML = `<li>Для квартиры «${selectedApartment.name}» пока нет заселений.</li>`;
    return;
  }

  currentBookings.forEach((booking) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${booking.client}</strong><br />
        ${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}
        ${booking.comment ? `<br /><small>${booking.comment}</small>` : ""}
      </div>
      <button type="button" data-booking-id="${booking.id}" class="secondary">Удалить</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      state.bookings = state.bookings.filter((entry) => entry.id !== booking.id);
      persist();
      renderCalendar();
      renderBookingsList();
    });

    bookingsList.appendChild(item);
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
  newApartmentNameInput.value = "";
  state.selectedApartmentId = state.apartments[state.apartments.length - 1].id;

  syncApartmentSelects();
  persist();
  renderApartmentsDialog();
  renderCalendar();
  renderBookingsList();
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
  persist();
  renderApartmentsDialog();
  renderCalendar();
  renderBookingsList();
}

function createApartment(name) {
  return { id: crypto.randomUUID(), name };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("ru-RU");
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
      apartments: Array.isArray(parsed.apartments) ? parsed.apartments : [],
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
    };
  } catch {
    const apartments = defaultApartments.map((name) => createApartment(name));
    return {
      selectedYear: new Date().getFullYear(),
      selectedApartmentId: apartments[0].id,
      apartments,
      bookings: [],
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
