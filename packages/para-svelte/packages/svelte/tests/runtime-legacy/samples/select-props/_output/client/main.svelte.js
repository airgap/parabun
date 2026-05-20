import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<select><option>a</option><option>b</option></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, () => [1, 2]);
	let log = $.prop($$props, 'log', 28, () => []);

	function handler(bar) {
		log(log().concat(bar));
	}

	var $$exports = {
		handler,
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get log() {
			return log();
		},

		set log($$value) {
			log($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, foo, $.index, ($$anchor, bar) => {
		var select = root_1();

		$.event('change', select, () => handler($.get(bar)));
		$.append($$anchor, select);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'handler', handler);

	return $.pop($$exports);
}