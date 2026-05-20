import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Comp1 from './Comp1.svelte';
import Comp2 from './Comp2.svelte';

var root = $.from_html(`<!> <button>Toggle Component</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const props = $.mutable_source();
	let view = $.mutable_source(Comp1);
	const bar = "bar";

	function cb() {}

	$.legacy_pre_effect(() => ($.get(view), Comp1), () => {
		$.set(props, $.get(view) === Comp1 ? { value: 1 } : { value: 2 });
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var node = $.first_child(fragment);

	$.component(node, () => $.get(view), ($$anchor, $$component) => {
		$$component($$anchor, $.spread_props(() => $.get(props), { foo: bar, cb }));
	});

	var button = $.sibling(node, 2);

	$.event('click', button, (e) => $.set(view, $.get(view) === Comp1 ? Comp2 : Comp1));
	$.append($$anchor, fragment);
	$.pop();
}