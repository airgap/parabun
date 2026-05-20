import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let value = $.state('');
	let resolver;

	function asd(v) {
		let r = Promise.withResolvers();

		function update_and_resolve() {
			$.update(count);
			r.resolve(v);
		}

		// make sure the second promise resolve before the first one
		if (resolver) {
			new Promise((r) => {
				setTimeout(r);
			}).then(update_and_resolve).then(() => {
				setTimeout(() => {
					resolver();
					resolver = null;
				});
			});
		} else if (v) {
			resolver = update_and_resolve;
		} else {
			Promise.resolve().then(update_and_resolve);
		}

		return r.promise;
	}

	var x;

	var $$promises = $.run([
		async () => x = await $.async_derived(() => asd($.get(value)))
	]);

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var text = $.sibling(input);

	$.template_effect(() => $.set_text(text, ` ${$.get(count) ?? ''} | ${$.get(x) ?? ''}`), void 0, void 0, [$$promises[0]]);

	$.run_after_blockers([$$promises[0]], () => {
		$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));
	});

	$.append($$anchor, fragment);
	$.pop();
}