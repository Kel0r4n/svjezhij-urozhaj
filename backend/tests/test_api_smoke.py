def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Свежий урожай" in r.json()["message"]


def test_products_list(client):
    r = client.get("/products")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_categories_list(client):
    r = client.get("/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
