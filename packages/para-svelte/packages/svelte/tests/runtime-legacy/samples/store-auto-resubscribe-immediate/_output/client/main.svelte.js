import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $value = () => $.store_get($.get(value), '$value', $$stores);
	const $one = () => $.store_get(one, '$one', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let value = $.mutable_source(writable({ foo: 1, bar: 2 }));

	$.store_mutate($.get(value), $.untrack($value // 3
	).foo = $value().foo + $value().bar, $.untrack($value));
	$.store_mutate($.get(value), $.untrack($value // 6
	).bar = $value().foo * $value().bar, $.untrack($value));

	// should resubscribe immediately
	$.store_unsub($.set(value, writable({ foo: $value().foo + 2, bar: $value().bar - 2 }) // { foo: 5, bar: 4 }
	), '$value', $$stores);

	// should mutate the store value
	$.store_mutate($.get(value), $.untrack($value // { foo: 5, bar: 4, baz: 9 }
	).baz = $value().foo + $value().bar, $.untrack($value));

	// should resubscribe immediately
	$.store_unsub($.set(value, writable({ qux: $value().baz - $value().foo }) // { qux: 4 }
	), '$value', $$stores);

	// making sure instrumentation returns the expression value
	$.store_set($.get(value), {
		one: writable($.store_set($.get(value), {
			two: (($$value) => {
				$.store_set($.get(value), $$value.$value);

				return $$value;
			})({ $value: { fred: $value().qux } })
		}))
	});

	const one = $value().one;

	$.get(value).update((val) => ({ answer: $one().two.$value.fred }));
	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [() => ($value(), $.untrack(() => JSON.stringify($value())))]);
	$.append($$anchor, text);
	$.pop();
	$$cleanup();
}