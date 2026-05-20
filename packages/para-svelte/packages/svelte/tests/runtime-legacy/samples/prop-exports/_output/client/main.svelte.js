import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $s1 = () => $.store_get(s1(), '$s1', $$stores);
	const $s2 = () => $.store_get(s2(), '$s2', $$stores);
	const $v1 = () => $.store_get(v1(), '$v1', $$stores);
	const $vs1 = () => $.store_get(vs1(), '$vs1', $$stores);
	const $s3 = () => $.store_get(s3(), '$s3', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	let // export multiple subscribables in one line
	u1 = $.prop($$props, 'u1', 12);

	let s1 = $.prop($$props, 's1', 12);
	let u2 = $.prop($$props, 'u2', 12);
	let s2 = $.prop($$props, 's2', 12);
	let p1 = $.prop($$props, 'p1', 12);
	let p2;
	let p3 = $.prop($$props, 'p3', 12);

	let // export previously declared props
	// aliased props <component a1={...} a2={...}> assign to v1, v2
	v1 = $.prop($$props, 'a1', 12);

	let v2 = $.prop($$props, 'a2', 12);

	// aliased export with initializer
	let vi1 = $.prop($$props, 'a3', 28, v2);

	// aliased subscribable export
	let vs1 = $.prop($$props, 'a4', 28, v1);

	// literal initializer
	let vl0 = $.prop($$props, 'vl0', 12, 'hello');

	// aliased with literal initializer
	let vl1 = $.prop($$props, 'a5', 12, 'test');

	let // aliased store surrounded by non-aliased non-stores
	n1 = $.prop($$props, 'n1', 12);

	let n2 = $.prop($$props, 'n2', 12);
	let s3 = $.prop($$props, 'a6', 12);

	let // keyword exports
	k1 = $.prop($$props, 'for', 12);

	let k2 = $.prop($$props, 'continue', 12);

	var $$exports = {
		get u1() {
			return u1();
		},

		set u1($$value) {
			u1($$value);
			$.flush();
		},

		get s1() {
			return s1();
		},

		set s1($$value) {
			s1($$value);
			$.flush();
		},

		get u2() {
			return u2();
		},

		set u2($$value) {
			u2($$value);
			$.flush();
		},

		get s2() {
			return s2();
		},

		set s2($$value) {
			s2($$value);
			$.flush();
		},

		get p1() {
			return p1();
		},

		set p1($$value) {
			p1($$value);
			$.flush();
		},

		get p3() {
			return p3();
		},

		set p3($$value) {
			p3($$value);
			$.flush();
		},

		get a1() {
			return v1();
		},

		set a1($$value) {
			v1($$value);
			$.flush();
		},

		get a2() {
			return v2();
		},

		set a2($$value) {
			v2($$value);
			$.flush();
		},

		get a3() {
			return vi1();
		},

		set a3($$value) {
			vi1($$value);
			$.flush();
		},

		get a4() {
			return vs1();
		},

		set a4($$value) {
			vs1($$value);
			$.flush();
		},

		get vl0() {
			return vl0();
		},

		set vl0($$value) {
			vl0($$value);
			$.flush();
		},

		get a5() {
			return vl1();
		},

		set a5($$value) {
			vl1($$value);
			$.flush();
		},

		get n1() {
			return n1();
		},

		set n1($$value) {
			n1($$value);
			$.flush();
		},

		get n2() {
			return n2();
		},

		set n2($$value) {
			n2($$value);
			$.flush();
		},

		get a6() {
			return s3();
		},

		set a6($$value) {
			s3($$value);
			$.flush();
		},

		get for() {
			return k1();
		},

		set for($$value) {
			k1($$value);
			$.flush();
		},

		get continue() {
			return k2();
		},

		set continue($$value) {
			k2($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `$s1=${$s1() ?? ''}
$s2=${$s2() ?? ''}
p1=${p1() ?? ''}
p3=${p3() ?? ''}
$v1=${$v1() ?? ''}
v2=${v2() ?? ''}
vi1=${vi1() ?? ''}
$vs1=${$vs1() ?? ''}
vl0=${vl0() ?? ''}
vl1=${vl1() ?? ''}
$s3=${$s3() ?? ''}
${k1() ?? ''}${k2() ?? ''}`));

	$.append($$anchor, text);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}