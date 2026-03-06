import React, { useState, useEffect } from "react";
import "./App.css";

function App() {

  const [items, setItems] = useState([]);

  const [form, setForm] = useState({
    name: "",
    quantity: 1,
    unit: "pièce",
    location: "Frigo",
    expiry: ""
  });

  const [filter, setFilter] = useState("Tous");

  const [showForm, setShowForm] = useState(false);

  // Charger les produits
  useEffect(() => {
    const saved = localStorage.getItem("frigoItems");
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  // Sauvegarder
  useEffect(() => {
    localStorage.setItem("frigoItems", JSON.stringify(items));
  }, [items]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addItem = (e) => {
    e.preventDefault();

    if (!form.name || !form.expiry) return;

    const newItem = {
      id: Date.now(),
      ...form,
      quantity: Number(form.quantity)
    };

    setItems([...items, newItem]);

    setForm({
      name: "",
      quantity: 1,
      unit: "pièce",
      location: "Frigo",
      expiry: ""
    });

    setShowForm(false);
  };

  const decreaseQuantity = (id) => {

    const updated = items
      .map(item =>
        item.id === id
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter(item => item.quantity > 0);

    setItems(updated);
  };

  const daysLeft = (date) => {

    const today = new Date();
    today.setHours(0,0,0,0);

    const expiry = new Date(date);
    expiry.setHours(0,0,0,0);

    const diff = expiry - today;

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const filteredItems =
    (filter === "Tous"
      ? items
      : items.filter(item => item.location === filter)
    ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

  const soonToExpire = items.filter(item => {
  const remaining = daysLeft(item.expiry);
  return remaining >= 0 && remaining <= 3;
  });

  return (
    <div className="container">

      <h1>Mes réserves</h1>

      {soonToExpire.length > 0 && (
        <div className="soonBox">
          ⚠️ <strong>À consommer bientôt :</strong>

          <ul>
            {soonToExpire.map(item => (
              <li key={item.id}>
                {item.name} ({daysLeft(item.expiry)} jours)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="filters">
        <button onClick={() => setFilter("Tous")}>Tous</button>
        <button onClick={() => setFilter("Frigo")}>Frigo</button>
        <button onClick={() => setFilter("Congélateur")}>Congélateur</button>
      </div>

      <button
        className="addButton"
        onClick={() => setShowForm(true)}
      >
        Ajouter un produit
      </button>


      {showForm && (

        <div
          className="modalOverlay"
          onClick={() => setShowForm(false)}
        >

          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="closeButton"
              onClick={() => setShowForm(false)}
              >
              ✕
            </button>
            <h2>Ajouter un produit</h2>

            <form onSubmit={addItem}>

              <div>
                <label>Nom du produit</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>Quantité</label>

                <div className="quantite">

                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={form.quantity}
                    onChange={handleChange}
                  />

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                  >
                    <option>pièce</option>
                    <option>g</option>
                    <option>ml</option>
                  </select>

                </div>
              </div>

              <div>
                <label>Localisation</label>

                <select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                >
                  <option>Frigo</option>
                  <option>Congélateur</option>
                </select>

              </div>

              <div>
                <label>Péremption</label>

                <input
                  type="date"
                  name="expiry"
                  value={form.expiry}
                  onChange={handleChange}
                />

              </div>

              <div className="modalButtons">

                <button type="submit">
                  Ajouter
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      <ul>

        {filteredItems.map(item => {

          const remaining = daysLeft(item.expiry);

          return (

            <li
              key={item.id}
              className={
                remaining < 0
                  ? "expired"
                  : remaining <= 3
                  ? "soon"
                  : remaining <= 5
                  ? "medium"
                  : "fresh"
              }
            >

              <strong>{item.name}</strong> — {item.quantity} {item.unit} ({item.location})

              <br />

              Péremption : {item.expiry} ({remaining} jours)

              <br />

              <button onClick={() => decreaseQuantity(item.id)}>
                Consommé (-1)
              </button>

            </li>

          );

        })}

      </ul>

    </div>
  );
}

export default App;