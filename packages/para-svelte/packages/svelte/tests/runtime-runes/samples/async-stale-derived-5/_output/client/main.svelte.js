import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { getAbortSignal } from 'svelte';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button> </button> <button>shift</button> <p> </p> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const queue = [];
	let n = $.state(1);
	let fizz = $.state(true);
	let buzz = $.state(true);

	function increment() {
		$.update(n);
		$.set(fizz, $.get(n) % 3 === 0);
		$.set(buzz, $.get(n) % 5 === 0);
	}

	function push(value) {
		if (value === 1) return 1;

		const d = Promise.withResolvers();

		queue.push(() => d.resolve(value));

		const signal = getAbortSignal();

		signal.onabort = () => d.reject(signal.reason);

		return d.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var text_1 = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		var consequent = ($$anchor) => {
			var p_1 = root_1();
			var text_2 = $.child(p_1);

			$.reset(p_1);
			$.template_effect(() => $.set_text(text_2, `fizz: ${$.get(fizz) ?? ''}`));
			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var p_2 = root_2();
			var text_3 = $.child(p_2);

			$.reset(p_2);
			$.template_effect(() => $.set_text(text_3, `buzz: ${$.get(buzz) ?? ''}`));
			$.append($$anchor, p_2);
		};

		$.if(node_1, ($$render) => {
			if (true) $$render(consequent_1);
		});
	}

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $0);
			$.set_text(text_1, `${$.get(n) ?? ''} = ${$1 ?? ''}`);
		},
		[() => $.eager(() => $.get(n))],
		[() => push($.get(n))]
	);

	$.delegated('click', button, increment);
	$.delegated('click', button_1, () => queue.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);