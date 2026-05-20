import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let greeting = $.prop($$props, 'greeting', 12, 'Hello');
	let name = 'world';

	// both functions, and `name` are hoistable, but hoistMe does not get hoisted
	function hoistMeMaybe() {
		return hoistMe(name); // comment out this line => hoistMe is hoisted
	}

	function hoistMe(name) {
		return name;
	}

	var $$exports = {
		get greeting() {
			return greeting();
		},

		set greeting($$value) {
			greeting($$value);
			$.flush();
		}
	};

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(($0) => $.set_text(text, `${greeting() ?? ''}, ${$0 ?? ''}`), [() => ($.untrack(hoistMeMaybe))]);
	$.append($$anchor, h1);

	return $.pop($$exports);
}