import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	function throwError() {
		throw new Error('nope');
	}

	const createElement = throwError;
	const createElement$ = throwError;
	let value = $.prop($$props, 'value', 28, () => template() + template$());

	function template() {
		return 'a';
	}

	function template$() {
		return 'b';
	}

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, p);

	return $.pop($$exports);
}