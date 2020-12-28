import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { AppComponent } from "./components/app";
import { enableMapSet } from "immer";

enableMapSet();

ReactDOM.render(<AppComponent />, document.getElementById("root"));
