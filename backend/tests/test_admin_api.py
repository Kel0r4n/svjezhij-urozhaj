"""Интеграционные тесты админ-API (дашборд, категории, товары, даты)."""


def test_admin_dashboard(client, admin_headers):
    r = client.get("/admin/dashboard", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert "orders_today" in data
    assert "orders_week" in data
    assert "total_revenue" in data
    assert isinstance(data["top_products"], list)


def test_admin_categories_list(client, admin_headers):
    r = client.get("/admin/categories", headers=admin_headers)
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list)
    assert len(cats) >= 1
    assert "slug" in cats[0] and "label" in cats[0]


def test_admin_category_crud(client, admin_headers):
    create = client.post(
        "/admin/categories",
        headers=admin_headers,
        json={"slug": "test_cat", "label": "Тестовая", "chart_color": "#AABBCC", "sort_order": 99},
    )
    assert create.status_code == 201, create.text
    cat = create.json()
    assert cat["slug"] == "test_cat"
    assert cat["label"] == "Тестовая"

    listed = client.get("/admin/categories", headers=admin_headers)
    slugs = [c["slug"] for c in listed.json()]
    assert "test_cat" in slugs

    updated = client.patch(
        f"/admin/categories/{cat['id']}",
        headers=admin_headers,
        json={"label": "Тест обновлён"},
    )
    assert updated.status_code == 200
    assert updated.json()["label"] == "Тест обновлён"

    deleted = client.delete(f"/admin/categories/{cat['id']}", headers=admin_headers)
    assert deleted.status_code == 204


def test_admin_products_with_auth(client, admin_headers):
    r = client.get("/products?include_inactive=true", headers=admin_headers)
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list)
    assert len(products) >= 1
    p = products[0]
    assert "image_zoom" in p
    assert "name" in p


def test_admin_create_product(client, admin_headers):
    r = client.post(
        "/products",
        headers=admin_headers,
        json={
            "name": "Тестовый товар",
            "price": 99.5,
            "description": "Описание",
            "category": "fruits",
            "stock": 10,
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["name"] == "Тестовый товар"
    assert data["category"] == "fruits"


def test_admin_sales_analytics(client, admin_headers):
    r = client.get("/admin/analytics/sales?days=30", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert "days" in data
    assert "all_categories" in data


def test_admin_requires_auth(client):
    r = client.get("/admin/dashboard")
    assert r.status_code == 403 or r.status_code == 401
