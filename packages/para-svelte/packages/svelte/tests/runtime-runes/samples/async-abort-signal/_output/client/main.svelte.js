import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { getAbortSignal } from 'svelte';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<h1> </h1>`);
var root = $.from_html(`<button>reset</button> <button>resolve</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let deferred = $.state($.proxy(Promise.withResolvers()));

	function load(deferred) {
		const signal = getAbortSignal();

		return new Promise((fulfil, reject) => {
			signal.onabort = (e) => {
				console.log('aborted');
				reject(e.currentTarget.reason);
			};

			deferred.promise.then(fulfil, reject);
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var h1 = root_2();
			var text = $.child(h1, true);

			$.reset(h1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => load($.get(deferred))]);
			$.append($$anchor, h1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve('hello'));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);