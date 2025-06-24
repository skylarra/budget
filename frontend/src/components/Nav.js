import React from 'react';
import { NavLink } from 'react-router-dom';

function Nav() {
    const linkClass = ({ isActive }) =>
       isActive ? "sideNavLink on-click" : "sideNavLink";
    
    return (
        <nav>
            <div className='sideNav'>
                <NavLink to="/home" className={linkClass}>Home</NavLink>
                <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                <NavLink to="/bills" className={linkClass}>Bills</NavLink>
                <NavLink to="/expenses" className={linkClass}>Expenses</NavLink>
                <NavLink to="/transactions" className={linkClass}>Transactions</NavLink>
                <NavLink to="/income" className={linkClass}>Income</NavLink>
            </div>
        </nav>
  );
};

export default Nav;