import requests
import re



def get_api_build_id():
    res = requests.get("https://www.sneakerjagers.com/en/sneakers").text
    return re.search('(?<="buildId":")[\w\d-]+', res).group(0)

API_DATA_BUILD_ID = get_api_build_id()
API_SEARCH_ENDPOINT = "https://www.sneakerjagers.com/api/sneakers/filter"
API_DATA_ENDPOINT = f"https://www.sneakerjagers.com/_next/data/{API_DATA_BUILD_ID}"


def get_search_query(
    search: str,
    pagination: int | None = None,
    **kwargs):
    payload = {
        "locale": "gb",
        "models": "air-jordan-1",
        "query": search,
        "page": pagination if pagination else 1,
        **kwargs
    }

    res = requests.post(API_SEARCH_ENDPOINT, json=payload)
    if(res.status_code < 200 or res.status_code >= 300):
        return None

    return res.json()


def get_product(shoe_id: str):
    redirect_res = requests.get(f"{API_DATA_ENDPOINT}/en/s/redirect/{shoe_id}.json")
    if(redirect_res.status_code < 200 or redirect_res.status_code >= 300):
        return None

    redirect_path = redirect_res.json()["pageProps"]["__N_REDIRECT"]
    res = requests.get(f"{API_DATA_ENDPOINT}{redirect_path}.json")
    if(res.status_code < 200 or res.status_code >= 300):
        return None

    return res.json()

def get_filters():
    res = requests.get(f"{API_DATA_ENDPOINT}/en/sneakers.json")
    if(res.status_code < 200 or res.status_code >= 300):
        return None

    return res.json()