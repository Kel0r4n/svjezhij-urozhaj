"""График доставки: блоки (день + маршрут)."""

from datetime import date, timedelta


def test_schedule_blocks_replace_seed_day(client, admin_headers):
    """Повторное сохранение на дату из seed не должно падать с IntegrityError."""
    listed = client.get("/admin/schedule/blocks", headers=admin_headers)
    assert listed.status_code == 200
    blocks = listed.json()
    assert blocks, "seed должен создать график"
    block = blocks[0]
    addr_id = block["entries"][0]["delivery_address_id"]

    resp = client.put(
        "/admin/schedule/blocks",
        headers=admin_headers,
        json={
            "slot_date": block["slot_date"],
            "entries": [{"delivery_address_id": addr_id, "delivery_time": "21:00"}],
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["entries"][0]["delivery_time"] == "21:00"


def test_schedule_blocks_crud(client, admin_headers):
    route_day = (date.today() + timedelta(days=10)).isoformat()
    addr = client.get("/admin/addresses", headers=admin_headers).json()[0]

    create = client.put(
        "/admin/schedule/blocks",
        headers=admin_headers,
        json={
            "slot_date": route_day,
            "entries": [
                {"delivery_address_id": addr["id"], "delivery_time": "19:00"},
                {"delivery_address_id": addr["id"], "delivery_time": "19:30"},
            ],
        },
    )
    # duplicate address same day — validation error
    assert create.status_code == 400

    create = client.put(
        "/admin/schedule/blocks",
        headers=admin_headers,
        json={
            "slot_date": route_day,
            "entries": [{"delivery_address_id": addr["id"], "delivery_time": "19:00"}],
        },
    )
    assert create.status_code == 200, create.text
    block = create.json()
    assert block["slot_date"] == route_day
    assert len(block["entries"]) == 1

    listed = client.get("/admin/schedule/blocks", headers=admin_headers)
    assert listed.status_code == 200
    dates = [b["slot_date"] for b in listed.json()]
    assert route_day in dates

    new_day = (date.today() + timedelta(days=11)).isoformat()
    updated = client.put(
        "/admin/schedule/blocks",
        headers=admin_headers,
        json={
            "slot_date": new_day,
            "previous_date": route_day,
            "entries": [{"delivery_address_id": addr["id"], "delivery_time": "20:00"}],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["slot_date"] == new_day

    deleted = client.delete(f"/admin/schedule/blocks/{new_day}", headers=admin_headers)
    assert deleted.status_code == 204
