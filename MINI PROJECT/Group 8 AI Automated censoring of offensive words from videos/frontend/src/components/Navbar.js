import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const navBrandStyle = {
    color: "white",
    fontSize: "2.5rem",
    fontWeight: "700",
    textDecoration: "none"
  };

  return (
    <nav className="navbar navbar-expand-lg fixed-top">
      <div className="container d-flex justify-content-center">
        <Link className="navbar-brand" to="/" style={navBrandStyle}>
          CleanVid
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;