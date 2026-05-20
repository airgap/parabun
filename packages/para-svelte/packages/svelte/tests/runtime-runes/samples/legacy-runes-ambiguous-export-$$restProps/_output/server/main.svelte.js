import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { get, set } from "./test.svelte.js";

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, []);

	$$renderer.component(($$renderer) => {
		$$restProps;
		$$renderer.push(`<p>${$.escape(get())}</p> <button></button>`);
	});
}