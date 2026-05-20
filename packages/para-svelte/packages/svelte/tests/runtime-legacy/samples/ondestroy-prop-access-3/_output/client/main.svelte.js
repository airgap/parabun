import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<!> <button>Del</button>`, 1);

export default function Main($$anchor) {
	let state = $.mutable_source({ title: 'foo' });
	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			const attributes = $.derived_safe_equal(() => (
				$.get(state),
				$.untrack(() => ({ title: $.get(state).title }))
			));

			Component($$anchor, $.spread_props(() => $.get(attributes)));
		};

		$.if(node, ($$render) => {
			if ($.get(state)) $$render(consequent);
		});
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, () => {
		$.set(state, undefined);
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);