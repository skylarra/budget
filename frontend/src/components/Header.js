import React from 'react';
import {NavLink} from 'react-router-dom';

function Header() {
  return (
      <div>
        <nav className='headerNav'>
            <NavLink to= "/">Budget Forcaster</NavLink>
          <div className='enterNav'>
            <NavLink to="/login">Login</NavLink> | <NavLink to="/register">Register</NavLink>
          </div>
        </nav>
      </div>
  );
};

export default Header;