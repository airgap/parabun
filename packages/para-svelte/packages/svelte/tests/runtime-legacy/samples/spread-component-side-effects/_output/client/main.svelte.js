import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, 'foo');
	let i = 0;

	const getProps = (foo) => {
		i += 1;

		return { foo, i };
	};

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		let $0 = $.derived_safe_equal(() => getProps(foo()));

		Widget(node, $.spread_props(() => $.get($0), { qux: 'named' }));
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}