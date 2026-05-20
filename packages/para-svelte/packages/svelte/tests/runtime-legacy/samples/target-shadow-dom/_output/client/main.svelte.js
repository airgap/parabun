import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import App from './App.svelte';
import { onMount, mount, unmount } from 'svelte';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let div = $.prop($$props, 'div', 12);

	onMount(() => {
		const root = div().attachShadow({ mode: 'open' });
		const app = mount(App, { target: root });

		return () => {
			unmount(app);
		};
	});

	var $$exports = {
		get div() {
			return div();
		},

		set div($$value) {
			div($$value);
			$.flush();
		}
	};

	$.init();

	var div_1 = root_1();

	$.bind_this(div_1, ($$value) => div($$value), () => div());
	$.append($$anchor, div_1);

	return $.pop($$exports);
}