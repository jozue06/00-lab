import logging
import time
from dataclasses import dataclass

import requests

from config import Settings

logger = logging.getLogger(__name__)

PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


@dataclass
class Business:
    place_id: str
    name: str
    address: str
    phone: str | None = None
    website: str | None = None
    rating: float | None = None
    user_ratings_total: int | None = None


class BusinessScanner:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.session = requests.Session()

    def scan(self) -> list[Business]:
        seen_ids: set[str] = set()
        businesses: list[Business] = []

        for area in self.settings.search_locations:
            location = self._resolve_location(area)
            logger.info("Scanning area: %s (center: %s)", area, location)

            for query in self.settings.search_queries:
                search_text = f"{query} in {area}"
                logger.info("Searching: %s", search_text)
                results = self._text_search(search_text, location)
                for place in results:
                    place_id = place.get("place_id")
                    if not place_id or place_id in seen_ids:
                        continue
                    seen_ids.add(place_id)

                    details = self._place_details(place_id)
                    business = Business(
                        place_id=place_id,
                        name=place.get("name", "Unknown"),
                        address=place.get("formatted_address", ""),
                        phone=details.get("formatted_phone_number"),
                        website=details.get("website"),
                        rating=place.get("rating"),
                        user_ratings_total=place.get("user_ratings_total"),
                    )
                    businesses.append(business)
                    logger.info("Found: %s (%s)", business.name, business.address)

                time.sleep(0.5)

        logger.info("Scan complete: %d unique businesses", len(businesses))
        return businesses

    def _resolve_location(self, area: str) -> str:
        if self.settings.search_lat is not None and self.settings.search_lng is not None:
            return f"{self.settings.search_lat},{self.settings.search_lng}"

        params = {
            "address": area,
            "key": self.settings.google_places_api_key,
        }
        response = self.session.get(GEOCODE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "OK" or not data.get("results"):
            raise RuntimeError(
                f"Could not geocode location '{area}': "
                f"{data.get('status')} {data.get('error_message', '')}"
            )
        location = data["results"][0]["geometry"]["location"]
        return f"{location['lat']},{location['lng']}"

    def _text_search(self, query: str, location: str) -> list[dict]:
        businesses: list[dict] = []
        params: dict[str, str | int] = {
            "query": query,
            "location": location,
            "radius": self.settings.search_radius_meters,
            "key": self.settings.google_places_api_key,
        }
        next_page_token: str | None = None

        while True:
            if next_page_token:
                params = {
                    "pagetoken": next_page_token,
                    "key": self.settings.google_places_api_key,
                }
                time.sleep(2)

            response = self.session.get(PLACES_TEXT_SEARCH_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            status = data.get("status")
            if status not in {"OK", "ZERO_RESULTS"}:
                raise RuntimeError(
                    f"Places search failed: {status} {data.get('error_message', '')}"
                )

            businesses.extend(data.get("results", []))
            next_page_token = data.get("next_page_token")
            if not next_page_token:
                break

        return businesses

    def _place_details(self, place_id: str) -> dict:
        params = {
            "place_id": place_id,
            "fields": "formatted_phone_number,website",
            "key": self.settings.google_places_api_key,
        }
        response = self.session.get(PLACES_DETAILS_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "OK":
            logger.warning("Details lookup failed for %s: %s", place_id, data.get("status"))
            return {}
        return data.get("result", {})
