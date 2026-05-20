import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p>pending a</p>`);
var root_3 = $.from_html(`<p>page a</p>`);
var root_5 = $.from_html(`<p>pending b</p>`);
var root_6 = $.from_html(`<p>page b</p>`);
var root = $.from_html(`<button>a</button> <button>b</button> <button>resolve a</button> <button>resolve b</button>  <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const /** @type {Array<() => void>} */
	/** @type {Array<() => void>} */
	snippet_a = ($$anchor) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		{
			const pending = ($$anchor) => {
				var p = root_2();

				$.append($$anchor, p);
			};

			$.boundary(node, { pending }, ($$anchor) => {
				let _a;

				var promises = $.run([
					async () => _a = (await $.save($.async_derived(async () => (await $.save(gate('a')))())))()
				]);

				var p_1 = root_3();

				$.append($$anchor, p_1);
			});
		}

		$.append($$anchor, fragment);
	};

	const snippet_b = ($$anchor) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			const pending = ($$anchor) => {
				var p_2 = root_5();

				$.append($$anchor, p_2);
			};

			$.boundary(node_1, { pending }, ($$anchor) => {
				let _b;

				var promises_1 = $.run([
					async () => _b = (await $.save($.async_derived(async () => (await $.save(gate('b')))())))()
				]);

				var p_3 = root_6();

				$.append($$anchor, p_3);
			});
		}

		$.append($$anchor, fragment_1);
	};

	let page = $.state('a');
	const a = [];
	const b = [];

	function gate(next) {
		const deferred = Promise.withResolvers();

		if (next === 'a') a.push(deferred.resolve); else b.push(deferred.resolve);

		return deferred.promise;
	}

	function nav(next) {
		$.set(page, next, true);
	}

	const to_render = $.derived(() => $.get(page) === 'a' ? snippet_a : snippet_b);
	var fragment_2 = root();
	var button = $.first_child(fragment_2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var node_2 = $.sibling(button_3, 2);

	$.snippet(node_2, () => $.get(to_render));
	$.delegated('click', button, () => nav('a'));
	$.delegated('click', button_1, () => nav('b'));
	$.delegated('click', button_2, () => a.shift()?.());
	$.delegated('click', button_3, () => b.shift()?.());
	$.append($$anchor, fragment_2);
	$.pop();
}

$.delegate(['click']);