import React from "react";
import Header from "./components/Header";
import Nav from "./components/Nav";
import { Routes, Route, useLocation } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Bills from "./components/Bills";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Expenses from "./components/Expenses";
import Transactions from "./components/Transactions.js";
import Income from "./components/Income.js";
import Home from "./pages/Home.js";

function App() {

  const token = localStorage.getItem("token");
  const loggedIn = token ? true : false;


  const location = useLocation();
  const hideNav = location.pathname === "/login" || location.pathname === "/register";
  const loginPage = (hideNav) => 
    hideNav ? 'enterBody' : 'main';
  
  if (!loggedIn && location.pathname !== "/register") {
    return (
      <div className="appContainer">
        <Header />
        <Login />
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/income" element={<Income />} />
            <Route path="/home" element={<Home />} />
          </Routes>
      </div>
    );
  } else if (loggedIn) {
    return (
      <div className="appContainer">
        <Header />

        <div className={loginPage(hideNav)}>
          {!hideNav && <Nav />}

          <div className="pageContent">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/income" element={<Income />} />
              <Route path="/home" element={<Home />} />
            </Routes>
          </div>
        </div>
      </div>
    )}
  };

export default App;
