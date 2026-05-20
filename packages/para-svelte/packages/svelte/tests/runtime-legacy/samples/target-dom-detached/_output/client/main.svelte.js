import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import App from './App.svelte';
import { onMount, mount, unmount } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let div = $.prop($$props, 'div', 12);

	onMount(() => {
		div(document.createElement('div'));

		const app = mount(App, { target: div() });

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

	return $.pop($$exports);
}