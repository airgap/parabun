import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>increment</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let deferreds = [];

	class X {
		constructor(promise) {
			this.promise = promise;
		}

		get then() {
			$.get(count);

			return (resolve) => this.promise.then(() => $.get(count)).then(resolve);
		}
	}

	function push() {
		const deferred = Promise.withResolvers();

		deferreds.push(deferred);

		return new X(deferred.promise);
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
			var p_1 = root_2();
			var text = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push()]);
			$.append($$anchor, p_1);
		});
	}

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => deferreds.pop()?.resolve($.get(count)));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);