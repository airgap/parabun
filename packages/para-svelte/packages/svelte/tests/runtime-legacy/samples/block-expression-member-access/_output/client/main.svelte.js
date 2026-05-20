import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const snip = ($$anchor) => {};
var root = $.from_html(`<!> <!> <!> <!> <!> <!> <div></div> <!> <button>inc</button> `, 1);

export default function Main($$anchor) {
	let count1 = $.mutable_source(1);
	let count2 = $.mutable_source(1);

	function fn(ret) {
		if ($.get(count1) > 100) return ret;

		$.update(count1);
		$.update(count2);

		return ret;
	}

	const obj = {
		get true() {
			return fn(true);
		},

		get false() {
			return fn(false);
		},

		get array() {
			return fn([]);
		},

		get string() {
			return fn('');
		},

		get promise() {
			return fn(Promise.resolve());
		},

		get snippet() {
			return fn(snip);
		},

		get attachment() {
			return fn(() => {});
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {};
		var consequent_1 = ($$anchor) => {};

		$.if(node, ($$render) => {
			if (($.untrack(() => obj.false))) $$render(consequent); else if (($.untrack(() => obj.true))) $$render(consequent_1, 1);
		});
	}

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, () => ($.untrack(() => obj.array)), $.index, ($$anchor, x) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, ($.get(x), '')));
		$.append($$anchor, text);
	});

	var node_2 = $.sibling(node_1, 2);

	$.key(node_2, () => ($.untrack(() => obj.string)), ($$anchor) => {});

	var node_3 = $.sibling(node_2, 2);

	$.await(node_3, () => ($.untrack(() => obj.promise)), ($$anchor) => {});

	var node_4 = $.sibling(node_3, 2);

	$.snippet(node_4, () => ($.untrack(() => obj.snippet)));

	var node_5 = $.sibling(node_4, 2);

	$.html(node_5, () => ($.untrack(() => obj.string)));

	var div = $.sibling(node_5, 2);

	$.attach(div, () => ($.untrack(() => obj.attachment)));

	var node_6 = $.sibling(div, 2);

	$.key(node_6, () => 1, ($$anchor) => {
		const x = $.derived_safe_equal(() => ($.untrack(() => obj.string)));
		var text_1 = $.text();

		$.template_effect(() => $.set_text(text_1, $.get(x)));
		$.append($$anchor, text_1);
	});

	var button = $.sibling(node_6, 2);
	var text_2 = $.sibling(button);

	$.template_effect(() => $.set_text(text_2, ` ${$.get(count1) ?? ''} - ${$.get(count2) ?? ''}`));
	$.event('click', button, () => $.update(count1));
	$.append($$anchor, fragment);
}