const searchForm = document.querySelector("#searchForm");
const cityInput = document.querySelector("#cityInput");
const statusElement = document.querySelector(".weather-status");
const resultElement = document.querySelector(".result");
const recentElement = document.querySelector("#recent");
const recentStorageKey = "weather-recent-searches";

const weatherDescriptions = {
	0: "Clear sky",
	1: "Mainly clear",
	2: "Partly cloudy",
	3: "Overcast",
	45: "Foggy",
	48: "Rime fog",
	51: "Light drizzle",
	53: "Moderate drizzle",
	55: "Dense drizzle",
	61: "Slight rain",
	63: "Moderate rain",
	65: "Heavy rain",
	71: "Slight snow",
	73: "Moderate snow",
	75: "Heavy snow",
	80: "Rain showers",
	81: "Moderate rain showers",
	82: "Violent rain showers",
	95: "Thunderstorm",
	96: "Thunderstorm with hail",
	99: "Thunderstorm with heavy hail"
};

function setStatus(message, isError = false, isLoading = false) {
	statusElement.className = isError ? "weather-status error" : "weather-status";
	statusElement.setAttribute("aria-busy", String(isLoading));
	statusElement.replaceChildren();

	if (isLoading) {
		const spinner = document.createElement("span");
		spinner.className = "spinner";
		spinner.setAttribute("aria-hidden", "true");
		statusElement.append(spinner, message);
		return;
	}

	statusElement.textContent = message;
}

function getRecentSearches() {
	try {
		const searches = JSON.parse(localStorage.getItem(recentStorageKey));
		return Array.isArray(searches) ? searches : [];
	} catch {
		return [];
	}
}

function saveRecentSearch(city) {
	const searches = getRecentSearches().filter((item) => item.toLowerCase() !== city.toLowerCase());
	searches.unshift(city);
	localStorage.setItem(recentStorageKey, JSON.stringify(searches.slice(0, 3)));
	renderRecentSearches();
}

function renderRecentSearches() {
	recentElement.replaceChildren();

	getRecentSearches().forEach((city) => {
		const item = document.createElement("li");
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = city;
		button.addEventListener("click", () => searchWeather(city));
		item.appendChild(button);
		recentElement.appendChild(item);
	});
}

async function searchWeather(city) {
	const query = city.trim();

	if (!query) {
		setStatus("Please enter a city name.", true);
		return;
	}

	setStatus("Loading weather...", false, true);
	resultElement.replaceChildren();
	resultElement.classList.remove("is-loaded");

	try {
		const locationResponse = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&countryCode=PK&format=json`
		);
		if (!locationResponse.ok) {
			throw new Error("Location search failed.");
		}

		const locationData = await locationResponse.json();
		const location = locationData.results?.[0];
		if (!location) {
			throw new Error(`No city found for "${query}".`);
		}

		const weatherResponse = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
		);
		if (!weatherResponse.ok) {
			throw new Error("Weather data could not be loaded.");
		}

		const weatherData = await weatherResponse.json();
		renderWeather(location, weatherData.current);
		saveRecentSearch(location.name);
		cityInput.value = location.name;
		setStatus("Weather updated.");
	} catch (error) {
		setStatus(error.message || "Something went wrong. Please try again.", true);
	}
}

function renderWeather(location, currentWeather) {
	resultElement.innerHTML = `
		<h2>${location.name}, ${location.country_code}</h2>
		<div class="temperature">${Math.round(currentWeather.temperature_2m)}°C</div>
		<p class="description">${weatherDescriptions[currentWeather.weather_code] || "Unknown conditions"}</p>
		<div class="weather-details">
			<span>Feels like ${Math.round(currentWeather.apparent_temperature)}°C</span>
			<span>Humidity ${currentWeather.relative_humidity_2m}%</span>
			<span>Wind ${Math.round(currentWeather.wind_speed_10m)} km/h</span>
		</div>
	`;
	requestAnimationFrame(() => resultElement.classList.add("is-loaded"));
}

searchForm.addEventListener("submit", (event) => {
	event.preventDefault();
	searchWeather(cityInput.value);
});

renderRecentSearches();
