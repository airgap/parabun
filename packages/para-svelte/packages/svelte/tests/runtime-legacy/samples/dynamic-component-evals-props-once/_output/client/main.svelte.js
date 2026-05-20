import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Comp1 from './Comp1.svelte';
import Comp2 from './Comp2.svelte';

var root = $.from_html(`<!> <button>Toggle Component</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let n = $.prop($$props, 'n', 12, 0);
	let view = $.mutable_source({ comp: Comp1, fn: () => $.update_pre_prop(n) });

	var $$exports = {
		get n() {
			return n();
		},

		set n($$value) {
			n($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	{
		let $0 = $.derived_safe_equal(() => ($.get(view), $.untrack(() => $.get(view).fn())));

		$.component(node, () => $.get(view).comp, ($$anchor, $$component) => {
			$$component($$anchor, {
				get value() {
					return $.get($0);
				}
			});
		});
	}

	var button = $.sibling(node, 2);

	$.event('click', button, (e) => $.mutate(view, $.get(view).comp = $.get(view).comp === Comp1 ? Comp2 : Comp1));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}