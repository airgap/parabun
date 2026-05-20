import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from "svelte/store";
import Tab from "./Tab.svelte";

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $tab = () => $.store_get(tab, '$tab', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let i = $.mutable_source(0);
	const { set, subscribe } = writable({ id: 1, name: "tab1" });

	const tab = {
		set(value) {
			$.update(i);
			set(value);
		},
		subscribe
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	Tab(node, {
		get tab() {
			$.mark_store_binding();

			return $tab();
		},

		set tab($$value) {
			$.store_set(tab, $$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(i)));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}