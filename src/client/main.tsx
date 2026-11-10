import { render } from "solid-js/web"
import { App } from "./app"
import "./app.css"

const system = window.matchMedia("(prefers-color-scheme: dark)")
const apply = () => (document.documentElement.dataset.colorScheme = system.matches ? "dark" : "light")
apply()
system.addEventListener("change", apply)

render(() => <App />, document.getElementById("app")!)
