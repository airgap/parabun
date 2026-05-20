import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>shift</button> <button>increment</button> <p> </p>`, 1);

export default function Component($$anchor) {
	let queue = [];
	let inited = false;

	function push(value) {
		const deferred = Promise.withResolvers();

		queue.push({ deferred, value });

		if (!inited) {
			inited = true;
			shift();
		}

		return deferred.promise;
	}

	function shift() {
		const next = queue.shift();

		next?.deferred.resolve(next.value);
	}

	let n = $.state(0);
	var current;

	var $$promises = $.run([
		async () => current = await $.async_derived(() => push($.get(n)))
	]);

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, `${$.get(n) ?? ''}: ${$0 ?? ''}`), [() => Math.min($.get(current), 3)], void 0, [$$promises[0]]);
	$.delegated('click', button, shift);
	$.delegated('click', button_1, () => $.set(n, $.get(n) + 1));
	$.append($$anchor, fragment);
}

$.delegate(['click']);