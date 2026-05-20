import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let events = $.prop($$props, 'events', 28, () => []);

	function log(event) {
		events().push(event);
	}

	var $$exports = {
		get events() {
			return events();
		},

		set events($$value) {
			events($$value);
			$.flush();
		}
	};

	$.init();
	$.event('mouseenter', $.document.body, () => log("enter"));
	$.event('mouseleave', $.document.body, () => log("leave"));

	return $.pop($$exports);
}