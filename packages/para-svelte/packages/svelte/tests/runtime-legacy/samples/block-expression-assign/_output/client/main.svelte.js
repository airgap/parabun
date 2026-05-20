import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const snip = ($$anchor) => {};
var root = $.from_html(`<!> <!> <!> <!> <!> <!> <div></div> <!> <!> <button>inc</button> `, 1);

export default function Main($$anchor) {
	let a = $.mutable_source(0);
	let b = $.mutable_source(0);
	let c = $.mutable_source(0);
	let d = $.mutable_source(0);
	let e = $.mutable_source(0);
	let f = $.mutable_source(0);
	let g = $.mutable_source(0);
	let h = $.mutable_source(0);
	let i = $.mutable_source(0);

	function inc() {
		$.update(a);
		$.update(b);
		$.update(c);
		$.update(d);
		$.update(e);
		$.update(f);
		$.update(g);
		$.update(h);
		$.update(i);
	}

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {};

		$.if(node, ($$render) => {
			if (($.get(a), $.untrack(() => $.set(a, 0)))) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, () => ($.get(b), $.untrack(() => [$.set(b, 0)])), $.index, ($$anchor, x) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, ($.get(x), '')));
		$.append($$anchor, text);
	});

	var node_2 = $.sibling(node_1, 2);

	$.key(node_2, () => ($.get(c), $.untrack(() => $.set(c, 0))), ($$anchor) => {});

	var node_3 = $.sibling(node_2, 2);

	$.await(node_3, () => ($.get(d), $.untrack(() => $.set(d, 0))), ($$anchor) => {});

	var node_4 = $.sibling(node_3, 2);

	$.snippet(node_4, () => ($.get(e), $.untrack(() => ($.set(e, 0), snip))));

	var node_5 = $.sibling(node_4, 2);

	$.html(node_5, () => ($.get(f), $.untrack(() => ($.set(f, 0), ''))));

	var div = $.sibling(node_5, 2);

	$.attach(div, () => ($.get(g), $.untrack(() => !!$.set(g, 0))));

	var node_6 = $.sibling(div, 2);

	$.key(node_6, () => 1, ($$anchor) => {
		const x = $.derived_safe_equal(() => ($.get(h), $.untrack(() => $.set(h, 0))));
		var text_1 = $.text();

		$.template_effect(() => $.set_text(text_1, ($.get(x), '')));
		$.append($$anchor, text_1);
	});

	var node_7 = $.sibling(node_6, 2);

	{
		var consequent_1 = ($$anchor) => {
			const x = $.derived_safe_equal(() => ($.get(i), $.untrack(() => $.set(i, 0))));
			var text_2 = $.text();

			$.template_effect(() => $.set_text(text_2, ($.get(x), '')));
			$.append($$anchor, text_2);
		};

		$.if(node_7, ($$render) => {
			if (1) $$render(consequent_1);
		});
	}

	var button = $.sibling(node_7, 2);
	var text_3 = $.sibling(button);

	$.template_effect(() => $.set_text(text_3, ` [${$.get(a) ?? ''},${$.get(b) ?? ''},${$.get(c) ?? ''},${$.get(d) ?? ''},${$.get(e) ?? ''},${$.get(f) ?? ''},${$.get(g) ?? ''},${$.get(h) ?? ''},${$.get(i) ?? ''}]`));
	$.event('click', button, inc);
	$.append($$anchor, fragment);
}