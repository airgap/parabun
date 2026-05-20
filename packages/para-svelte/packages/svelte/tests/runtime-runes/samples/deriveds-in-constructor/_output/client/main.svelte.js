import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Foo {
		#state = $.state('state');
		#derived = $.derived(() => 'derived ' + $.get(this.#state));

		#derivedBy = $.derived(() => {
			return 'derived.by ' + $.get(this.#derived);
		});

		initial;

		constructor() {
			this.initial = [this.#state.v, $.get(this.#derived), $.get(this.#derivedBy)];
		}
	}

	const foo = new Foo();
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, foo.initial));
	$.append($$anchor, p);
	$.pop();
}