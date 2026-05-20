import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let titles = $.prop($$props, 'titles', 12);

	var $$exports = {
		get titles() {
			return titles();
		},

		set titles($$value) {
			titles($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, titles, (title) => title.name, ($$anchor, title) => {
		Nested($$anchor, {
			get title() {
				return ($.get(title), $.untrack(() => $.get(title).name));
			}
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}