import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	function foo(node, params) {
		return {
			delay: params.delay,
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 1, things, $.index, ($$anchor, thing, i) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, $.get(thing)));
		$.transition(2, span, () => foo, () => ({ delay: i * 50 }));
		$.append($$anchor, span);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}