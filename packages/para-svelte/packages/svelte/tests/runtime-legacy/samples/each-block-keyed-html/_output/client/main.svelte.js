import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let names = $.prop($$props, 'names', 28, () => ['John', 'Jill']);

	var $$exports = {
		get names() {
			return names();
		},

		set names($$value) {
			names($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, names, (name) => name, ($$anchor, name) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.html(node_1, () => $.get(name));
		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}