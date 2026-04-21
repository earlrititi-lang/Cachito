class CachitoReservationWidget {
  static styleId = "cachito-reservation-widget-styles"

  static defaultTimes = [
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ]

  static weekdayLabels = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"]

  constructor(options = {}) {
    const today = this.startOfDay(options.minDate || new Date())
    const initialDate = this.parseDate(options.initialDate)
    const initialGuests = this.clampGuests(
      options.initialGuests ?? 2,
      options.minGuests ?? 1,
      options.maxGuests ?? 12,
    )

    this.options = {
      title: options.title || "Cachito",
      creditPrefix: options.creditPrefix || "Creado con carino por",
      partnerName: options.partnerName || "TheFork",
      locale: options.locale || "es-ES",
      minDate: today,
      minGuests: options.minGuests ?? 1,
      maxGuests: options.maxGuests ?? 12,
      times: Array.isArray(options.times) && options.times.length
        ? options.times.slice()
        : CachitoReservationWidget.defaultTimes.slice(),
      isDateAvailable: typeof options.isDateAvailable === "function" ? options.isDateAvailable : null,
      isTimeAvailable: typeof options.isTimeAvailable === "function" ? options.isTimeAvailable : null,
      onChange: typeof options.onChange === "function" ? options.onChange : null,
    }

    this.state = {
      activeTab: "date",
      monthCursor: this.startOfMonth(initialDate || today),
      selectedDate: initialDate,
      guests: initialGuests,
      selectedTime: options.initialTime || null,
    }

    this.root = null
    this.handleClick = this.handleClick.bind(this)
  }

  mount(target) {
    const container = typeof target === "string"
      ? document.querySelector(target)
      : target

    if (!container) {
      throw new Error("CachitoReservationWidget: target container not found.")
    }

    this.ensureStyles()

    if (this.root) {
      this.unmount()
    }

    this.root = document.createElement("section")
    this.root.className = "reservation-widget"
    this.root.setAttribute("aria-label", "Selector de reserva")
    this.root.addEventListener("click", this.handleClick)

    container.appendChild(this.root)
    this.render()

    return this
  }

  unmount() {
    if (!this.root) {
      return
    }

    this.root.removeEventListener("click", this.handleClick)
    this.root.remove()
    this.root = null
  }

  destroy() {
    this.unmount()
  }

  getValue() {
    return {
      date: this.state.selectedDate ? this.toIsoDate(this.state.selectedDate) : null,
      guests: this.state.guests,
      time: this.state.selectedTime,
    }
  }

  setValue(next = {}) {
    if (next.date !== undefined) {
      const parsedDate = this.parseDate(next.date)
      this.state.selectedDate = parsedDate

      if (parsedDate) {
        this.state.monthCursor = this.startOfMonth(parsedDate)
      }
    }

    if (next.guests !== undefined) {
      this.state.guests = this.clampGuests(
        next.guests,
        this.options.minGuests,
        this.options.maxGuests,
      )
    }

    if (next.time !== undefined) {
      this.state.selectedTime = next.time
    }

    if (next.activeTab === "date" || next.activeTab === "guests" || next.activeTab === "time") {
      this.state.activeTab = next.activeTab
    }

    if (this.root) {
      this.render()
    }

    this.emitChange("setValue")
  }

  handleClick(event) {
    const tabButton = event.target.closest("[data-tab]")
    if (tabButton) {
      this.state.activeTab = tabButton.dataset.tab
      this.render()
      return
    }

    const monthButton = event.target.closest("[data-month-offset]")
    if (monthButton) {
      const offset = Number.parseInt(monthButton.dataset.monthOffset, 10)
      this.state.monthCursor = this.addMonths(this.state.monthCursor, offset)
      this.render()
      return
    }

    const dayButton = event.target.closest("[data-date]")
    if (dayButton) {
      const date = this.parseDate(dayButton.dataset.date)
      if (!date || this.isDateDisabled(date)) {
        return
      }

      this.state.selectedDate = date
      this.state.monthCursor = this.startOfMonth(date)
      this.state.activeTab = "guests"
      this.render()
      this.emitChange("date")
      return
    }

    const guestButton = event.target.closest("[data-guests]")
    if (guestButton) {
      this.state.guests = this.clampGuests(
        Number.parseInt(guestButton.dataset.guests, 10),
        this.options.minGuests,
        this.options.maxGuests,
      )
      this.state.activeTab = "time"
      this.render()
      this.emitChange("guests")
      return
    }

    const timeButton = event.target.closest("[data-time]")
    if (timeButton) {
      const time = timeButton.dataset.time
      if (this.isTimeDisabled(time)) {
        return
      }

      this.state.selectedTime = time
      this.render()
      this.emitChange("time")
    }
  }

  emitChange(reason) {
    const detail = {
      ...this.getValue(),
      activeTab: this.state.activeTab,
      reason,
      complete: Boolean(this.state.selectedDate && this.state.guests && this.state.selectedTime),
    }

    if (this.options.onChange) {
      this.options.onChange(detail, this)
    }

    if (this.root) {
      this.root.dispatchEvent(new CustomEvent("reservationchange", { detail }))
    }
  }

  render() {
    if (!this.root) {
      return
    }

    this.root.innerHTML = `
      <div class="reservation-widget__shell">
        <header class="reservation-widget__header">
          <h2 class="reservation-widget__title">${this.escapeHtml(this.options.title)}</h2>
          <p class="reservation-widget__credit">
            ${this.escapeHtml(this.options.creditPrefix)}
            <span>${this.escapeHtml(this.options.partnerName)}</span>
          </p>
        </header>
        <div class="reservation-widget__tabs" role="tablist" aria-label="Seleccion de reserva">
          ${this.renderTab("date", this.iconCalendar(), "Fecha", this.state.selectedDate ? this.formatShortDate(this.state.selectedDate) : "Elegir")}
          ${this.renderTab("guests", this.iconGuests(), "Pers.", `${this.state.guests} ${this.state.guests === 1 ? "pers." : "pers."}`)}
          ${this.renderTab("time", this.iconClock(), "Hora", this.state.selectedTime || "Elegir")}
        </div>
        <div class="reservation-widget__panel">
          ${this.renderPanel()}
        </div>
        <footer class="reservation-widget__summary" aria-live="polite">
          <div class="reservation-widget__summary-item">
            <span class="reservation-widget__summary-label">Fecha</span>
            <strong>${this.state.selectedDate ? this.formatLongDate(this.state.selectedDate) : "Sin seleccionar"}</strong>
          </div>
          <div class="reservation-widget__summary-item">
            <span class="reservation-widget__summary-label">Personas</span>
            <strong>${this.state.guests}</strong>
          </div>
          <div class="reservation-widget__summary-item">
            <span class="reservation-widget__summary-label">Hora</span>
            <strong>${this.state.selectedTime || "Sin seleccionar"}</strong>
          </div>
        </footer>
      </div>
    `
  }

  renderTab(tab, icon, label, value) {
    const isActive = this.state.activeTab === tab

    return `
      <button
        class="reservation-widget__tab${isActive ? " is-active" : ""}"
        type="button"
        role="tab"
        aria-selected="${isActive ? "true" : "false"}"
        data-tab="${tab}"
      >
        <span class="reservation-widget__tab-line">
          ${icon}
          <span>${label}</span>
        </span>
        <span class="reservation-widget__tab-value">${this.escapeHtml(value)}</span>
      </button>
    `
  }

  renderPanel() {
    if (this.state.activeTab === "guests") {
      return this.renderGuestsPanel()
    }

    if (this.state.activeTab === "time") {
      return this.renderTimePanel()
    }

    return this.renderDatePanel()
  }

  renderDatePanel() {
    const days = this.buildCalendarDays(this.state.monthCursor)

    return `
      <div class="reservation-widget__calendar">
        <div class="reservation-widget__calendar-header">
          <button class="reservation-widget__nav" type="button" aria-label="Mes anterior" data-month-offset="-1">
            ${this.iconChevron("left")}
          </button>
          <h3 class="reservation-widget__calendar-title">${this.escapeHtml(this.formatMonthLabel(this.state.monthCursor))}</h3>
          <button class="reservation-widget__nav" type="button" aria-label="Mes siguiente" data-month-offset="1">
            ${this.iconChevron("right")}
          </button>
        </div>
        <div class="reservation-widget__weekdays">
          ${CachitoReservationWidget.weekdayLabels.map((label) => `
            <span class="reservation-widget__weekday">${label}</span>
          `).join("")}
        </div>
        <div class="reservation-widget__calendar-grid">
          ${days.map((day) => this.renderCalendarCell(day)).join("")}
        </div>
      </div>
    `
  }

  renderCalendarCell(day) {
    if (!day) {
      return `<span class="reservation-widget__day reservation-widget__day--empty" aria-hidden="true"></span>`
    }

    const classes = ["reservation-widget__day"]
    if (day.disabled) {
      classes.push("is-disabled")
    } else {
      classes.push("is-available")
    }

    if (day.selected) {
      classes.push("is-selected")
    }

    return `
      <button
        class="${classes.join(" ")}"
        type="button"
        ${day.disabled ? "disabled" : ""}
        aria-pressed="${day.selected ? "true" : "false"}"
        data-date="${day.iso}"
      >
        <span>${day.day}</span>
      </button>
    `
  }

  renderGuestsPanel() {
    const guestButtons = []
    for (let guestCount = this.options.minGuests; guestCount <= this.options.maxGuests; guestCount += 1) {
      guestButtons.push(`
        <button
          class="reservation-widget__option${this.state.guests === guestCount ? " is-selected" : ""}"
          type="button"
          data-guests="${guestCount}"
          aria-pressed="${this.state.guests === guestCount ? "true" : "false"}"
        >
          <strong>${guestCount}</strong>
          <span>${guestCount === 1 ? "persona" : "personas"}</span>
        </button>
      `)
    }

    return `
      <div class="reservation-widget__section">
        <div class="reservation-widget__section-head">
          <h3>Selecciona personas</h3>
          <p>Elige el tamano de la reserva antes de pasar a la hora.</p>
        </div>
        <div class="reservation-widget__option-grid">
          ${guestButtons.join("")}
        </div>
      </div>
    `
  }

  renderTimePanel() {
    if (!this.state.selectedDate) {
      return `
        <div class="reservation-widget__empty-state">
          <p>Selecciona una fecha para desbloquear los horarios.</p>
          <button class="reservation-widget__back-link" type="button" data-tab="date">Ir a fecha</button>
        </div>
      `
    }

    const groupedTimes = this.groupTimes(this.options.times)

    return `
      <div class="reservation-widget__section">
        <div class="reservation-widget__section-head">
          <h3>Selecciona hora</h3>
          <p>${this.escapeHtml(this.formatLongDate(this.state.selectedDate))} para ${this.state.guests} ${this.state.guests === 1 ? "persona" : "personas"}.</p>
        </div>
        ${groupedTimes.map((group) => `
          <div class="reservation-widget__time-group">
            <div class="reservation-widget__time-label">${this.escapeHtml(group.label)}</div>
            <div class="reservation-widget__time-grid">
              ${group.items.map((time) => this.renderTimeButton(time)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `
  }

  renderTimeButton(time) {
    const disabled = this.isTimeDisabled(time)
    const selected = this.state.selectedTime === time

    return `
      <button
        class="reservation-widget__option reservation-widget__option--time${selected ? " is-selected" : ""}"
        type="button"
        ${disabled ? "disabled" : ""}
        aria-pressed="${selected ? "true" : "false"}"
        data-time="${time}"
      >
        <strong>${this.escapeHtml(time)}</strong>
      </button>
    `
  }

  buildCalendarDays(monthDate) {
    const firstDay = this.startOfMonth(monthDate)
    const startOffset = (firstDay.getDay() + 6) % 7
    const totalDays = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
    const cells = []

    for (let index = 0; index < startOffset; index += 1) {
      cells.push(null)
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), day)
      const disabled = this.isDateDisabled(date)

      cells.push({
        day,
        iso: this.toIsoDate(date),
        disabled,
        selected: this.sameDay(date, this.state.selectedDate),
      })
    }

    while (cells.length % 7 !== 0) {
      cells.push(null)
    }

    return cells
  }

  isDateDisabled(date) {
    if (this.startOfDay(date) < this.options.minDate) {
      return true
    }

    if (this.options.isDateAvailable) {
      return this.options.isDateAvailable(date, this.getValue()) === false
    }

    return false
  }

  isTimeDisabled(time) {
    if (!this.state.selectedDate) {
      return true
    }

    if (this.options.isTimeAvailable) {
      return this.options.isTimeAvailable(time, this.getValue()) === false
    }

    return false
  }

  groupTimes(times) {
    const groups = [
      { label: "Comida", items: [] },
      { label: "Cena", items: [] },
    ]

    for (const time of times) {
      const hour = Number.parseInt(time.split(":")[0], 10)
      if (hour < 18) {
        groups[0].items.push(time)
      } else {
        groups[1].items.push(time)
      }
    }

    return groups.filter((group) => group.items.length > 0)
  }

  ensureStyles() {
    if (document.getElementById(CachitoReservationWidget.styleId)) {
      return
    }

    const styleTag = document.createElement("style")
    styleTag.id = CachitoReservationWidget.styleId
    styleTag.textContent = `
      .reservation-widget {
        --rw-bg: #f7f5f1;
        --rw-surface: #ffffff;
        --rw-ink: #161616;
        --rw-muted: #8a8f94;
        --rw-line: #d8d5cf;
        --rw-soft: #e7e7e5;
        --rw-accent: #bfdad4;
        --rw-accent-ink: #0d6b67;
        width: min(100%, 35rem);
        color: var(--rw-ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .reservation-widget *,
      .reservation-widget *::before,
      .reservation-widget *::after {
        box-sizing: border-box;
      }

      .reservation-widget__shell {
        background: linear-gradient(180deg, #fcfbf8 0%, var(--rw-bg) 100%);
        border: 1px solid rgba(22, 22, 22, 0.08);
        border-radius: 2rem;
        padding: 1.6rem;
        box-shadow: 0 1.25rem 3rem rgba(18, 28, 34, 0.08);
      }

      .reservation-widget__header {
        text-align: center;
        margin-bottom: 1.35rem;
      }

      .reservation-widget__title {
        margin: 0;
        font-size: clamp(1.8rem, 3vw, 2.3rem);
        line-height: 1.05;
      }

      .reservation-widget__credit {
        margin: 0.65rem 0 0;
        color: #4b4f53;
        font-size: 0.98rem;
      }

      .reservation-widget__credit span {
        color: var(--rw-accent-ink);
        font-weight: 700;
      }

      .reservation-widget__tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--rw-line);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 1.4rem;
      }

      .reservation-widget__tab {
        display: grid;
        gap: 0.16rem;
        padding: 0.8rem 0.95rem;
        border: 0;
        background: transparent;
        color: var(--rw-muted);
        cursor: pointer;
        text-align: left;
        transition: background-color 160ms ease, color 160ms ease;
      }

      .reservation-widget__tab + .reservation-widget__tab {
        border-left: 1px solid var(--rw-line);
      }

      .reservation-widget__tab.is-active {
        background: var(--rw-accent);
        color: var(--rw-accent-ink);
      }

      .reservation-widget__tab-line {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-weight: 700;
      }

      .reservation-widget__tab-value {
        font-size: 0.82rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .reservation-widget__tab svg,
      .reservation-widget__nav svg {
        width: 1rem;
        height: 1rem;
        flex: 0 0 auto;
      }

      .reservation-widget__calendar-header {
        display: grid;
        grid-template-columns: 2.25rem 1fr 2.25rem;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .reservation-widget__calendar-title {
        margin: 0;
        text-align: center;
        font-size: clamp(1.45rem, 2.4vw, 2rem);
        font-weight: 700;
      }

      .reservation-widget__nav {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--rw-muted);
        cursor: pointer;
      }

      .reservation-widget__weekdays,
      .reservation-widget__calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 0.35rem;
      }

      .reservation-widget__weekdays {
        margin-bottom: 0.45rem;
      }

      .reservation-widget__weekday {
        text-align: center;
        color: #404449;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
      }

      .reservation-widget__day,
      .reservation-widget__day--empty {
        aspect-ratio: 1 / 0.92;
        border-radius: 0.72rem;
      }

      .reservation-widget__day {
        display: grid;
        place-items: center;
        border: 1px solid transparent;
        background: var(--rw-soft);
        color: #8d8d8d;
        font-size: 1.05rem;
      }

      .reservation-widget__day.is-available {
        background: var(--rw-surface);
        border-color: rgba(22, 22, 22, 0.14);
        color: var(--rw-ink);
        cursor: pointer;
      }

      .reservation-widget__day.is-selected {
        background: var(--rw-accent);
        border-color: var(--rw-accent);
        color: var(--rw-accent-ink);
        font-weight: 700;
      }

      .reservation-widget__day.is-disabled {
        opacity: 0.92;
        cursor: not-allowed;
      }

      .reservation-widget__day--empty {
        display: block;
      }

      .reservation-widget__section-head {
        margin-bottom: 1rem;
      }

      .reservation-widget__section-head h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .reservation-widget__section-head p {
        margin: 0.35rem 0 0;
        color: var(--rw-muted);
        line-height: 1.45;
      }

      .reservation-widget__option-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.6rem;
      }

      .reservation-widget__time-group + .reservation-widget__time-group {
        margin-top: 1rem;
      }

      .reservation-widget__time-label {
        margin-bottom: 0.5rem;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--rw-muted);
        text-transform: uppercase;
      }

      .reservation-widget__time-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(5.3rem, 1fr));
        gap: 0.6rem;
      }

      .reservation-widget__option {
        display: grid;
        gap: 0.2rem;
        align-items: center;
        justify-items: center;
        min-height: 4rem;
        padding: 0.8rem 0.6rem;
        border-radius: 1rem;
        border: 1px solid rgba(22, 22, 22, 0.12);
        background: var(--rw-surface);
        color: var(--rw-ink);
        cursor: pointer;
        transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms ease;
      }

      .reservation-widget__option strong {
        font-size: 1rem;
        line-height: 1;
      }

      .reservation-widget__option span {
        color: var(--rw-muted);
        font-size: 0.78rem;
      }

      .reservation-widget__option--time {
        min-height: 3.35rem;
      }

      .reservation-widget__option--time strong {
        font-size: 0.98rem;
      }

      .reservation-widget__option.is-selected {
        background: var(--rw-accent);
        border-color: var(--rw-accent);
        color: var(--rw-accent-ink);
      }

      .reservation-widget__option.is-selected span {
        color: var(--rw-accent-ink);
      }

      .reservation-widget__option:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .reservation-widget__summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(22, 22, 22, 0.08);
      }

      .reservation-widget__summary-item {
        min-width: 0;
      }

      .reservation-widget__summary-item strong {
        display: block;
        font-size: 0.96rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .reservation-widget__summary-label {
        display: block;
        margin-bottom: 0.16rem;
        color: var(--rw-muted);
        font-size: 0.78rem;
      }

      .reservation-widget__empty-state {
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        padding: 2rem 1rem;
        text-align: center;
        color: var(--rw-muted);
      }

      .reservation-widget__back-link {
        border: 0;
        background: transparent;
        color: var(--rw-accent-ink);
        font-weight: 700;
        cursor: pointer;
      }

      @media (max-width: 40rem) {
        .reservation-widget__shell {
          padding: 1.15rem;
          border-radius: 1.5rem;
        }

        .reservation-widget__tabs {
          border-radius: 1.35rem;
        }

        .reservation-widget__tab {
          padding: 0.7rem 0.75rem;
        }

        .reservation-widget__option-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .reservation-widget__summary {
          grid-template-columns: 1fr;
        }
      }
    `

    document.head.appendChild(styleTag)
  }

  formatMonthLabel(date) {
    const raw = new Intl.DateTimeFormat(this.options.locale, {
      month: "long",
      year: "numeric",
    }).format(date)

    return raw
      .split(" ")
      .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      .join(" ")
  }

  formatShortDate(date) {
    const raw = new Intl.DateTimeFormat(this.options.locale, {
      day: "numeric",
      month: "short",
    }).format(date)

    return raw.replace(".", "")
  }

  formatLongDate(date) {
    return new Intl.DateTimeFormat(this.options.locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  toIsoDate(date) {
    return [
      date.getFullYear(),
      `${date.getMonth() + 1}`.padStart(2, "0"),
      `${date.getDate()}`.padStart(2, "0"),
    ].join("-")
  }

  parseDate(value) {
    if (!value) {
      return null
    }

    if (value instanceof Date) {
      return this.startOfDay(value)
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : this.startOfDay(date)
  }

  startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1)
  }

  sameDay(a, b) {
    if (!a || !b) {
      return false
    }

    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
  }

  clampGuests(value, min, max) {
    const number = Number.parseInt(value, 10)
    if (Number.isNaN(number)) {
      return min
    }

    return Math.min(max, Math.max(min, number))
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;")
  }

  iconCalendar() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2"></rect>
        <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17"></path>
        <path d="M8 13h3M13 13h3M8 17h3"></path>
      </svg>
    `
  }

  iconGuests() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 12a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 12Z"></path>
        <path d="M16.5 10.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"></path>
        <path d="M3.5 18.5c.6-2.4 2.45-3.75 4.5-3.75s3.9 1.35 4.5 3.75"></path>
        <path d="M13 18.5c.35-1.55 1.55-2.6 3.2-2.6 1.65 0 2.85 1.05 3.2 2.6"></path>
      </svg>
    `
  }

  iconClock() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="8.5"></circle>
        <path d="M12 7.5v5l3 2"></path>
      </svg>
    `
  }

  iconChevron(direction) {
    const path = direction === "left" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}"></path>
      </svg>
    `
  }
}

if (typeof window !== "undefined") {
  window.CachitoReservationWidget = CachitoReservationWidget
}
